/**
 * Sets up (or updates) the Supabase database directly over Postgres.
 *
 *   npm run db:setup              # apply pending migrations, then the seeds
 *   npm run db:setup -- --status  # only report what is applied
 *   npm run db:setup -- --admin you@example.com   # also make that user an active administrator
 *
 * Needs SUPABASE_DB_URL in .env.local: Supabase → Connect → "Session pooler" connection string,
 * with your database password filled in. Each migration runs in its own transaction and is
 * recorded in public.schema_migrations, so running this again only applies what is new.
 * Seeds are idempotent (they never overwrite existing rows).
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Minimal .env.local reader (no extra dependency).
for (const line of readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
}
const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("SUPABASE_DB_URL is missing from .env.local (Supabase → Connect → Session pooler).");
  process.exit(1);
}

const args = process.argv.slice(2);
const statusOnly = args.includes("--status");
const adminEmail = args.includes("--admin") ? args[args.indexOf("--admin") + 1] : null;

const sql = postgres(url, { ssl: "require", max: 1, onnotice: () => {}, connect_timeout: 20 });

try {
  const [{ version }] = await sql`select version()`;
  console.log(`Connected: ${version.split(",")[0]}`);

  await sql`create table if not exists public.schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
  await sql`alter table public.schema_migrations enable row level security`;
  const applied = new Set((await sql`select name from public.schema_migrations`).map((r) => r.name));

  // A database set up earlier by hand (SQL editor) has the tables but no record of it.
  if (!applied.size) {
    const [{ exists }] = await sql`select to_regclass('public.products') is not null as exists`;
    if (exists) {
      const [{ cms }] = await sql`select to_regclass('public.cms_pages') is not null as cms`;
      const already = readdirSync(join(root, "supabase/migrations")).filter((f) => f.endsWith(".sql") && (cms || f < "20261017"));
      for (const f of already) {
        await sql`insert into public.schema_migrations (name) values (${f}) on conflict do nothing`;
        applied.add(f);
      }
      console.log(`Found an existing schema; recorded ${already.length} migration(s) as applied.`);
    }
  }

  const files = readdirSync(join(root, "supabase/migrations")).filter((f) => f.endsWith(".sql")).sort();
  const pending = files.filter((f) => !applied.has(f));
  console.log(`Migrations: ${files.length - pending.length} applied, ${pending.length} pending`);
  if (statusOnly) {
    pending.forEach((f) => console.log(`  pending  ${f}`));
  } else {
    for (const f of pending) {
      process.stdout.write(`  applying ${f} … `);
      await sql.begin(async (tx) => {
        await tx.unsafe(readFileSync(join(root, "supabase/migrations", f), "utf8"));
        await tx`insert into public.schema_migrations (name) values (${f})`;
      });
      console.log("done");
    }
    for (const f of ["seed.sql", "seed-cms.sql"]) {
      process.stdout.write(`  seeding  ${f} … `);
      await sql.unsafe(readFileSync(join(root, "supabase", f), "utf8"));
      console.log("done");
    }
    await sql`notify pgrst, 'reload schema'`;
  }

  if (adminEmail && !statusOnly) {
    const rows = await sql`update public.profiles set role = 'admin', is_active = true where lower(email) = lower(${adminEmail}) returning email`;
    console.log(rows.length ? `Administrator: ${rows[0].email}` : `No user ${adminEmail} yet — create it in Authentication → Users, then run again with --admin.`);
  }

  const counts = await sql`
    select (select count(*) from public.categories) as categories, (select count(*) from public.products) as products,
           (select count(*) from public.product_models) as models, (select count(*) from public.cms_pages) as pages,
           (select count(*) from public.profiles where is_active) as active_staff`;
  console.log("Contents:", Object.fromEntries(Object.entries(counts[0]).map(([k, v]) => [k, Number(v)])));
} catch (e) {
  console.error(`\nFailed: ${e.message}`);
  if (e.position) console.error(`(at character ${e.position})`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
