/**
 * Runs every migration and the seed on an in-process Postgres (PGlite) with minimal stand-ins
 * for Supabase's auth and storage schemas, then checks the row-level security rules for each role.
 *
 *   npm run test:db
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const db = new PGlite({ extensions: { pg_trgm } });

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failures++;
};

// Supabase stand-ins: roles, auth.users / auth.uid(), storage buckets and objects.
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create schema extensions;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant usage on schema public, auth, storage, extensions to anon, authenticated;
`);

// --combined runs supabase/setup-all.sql (every migration and seed in one file) instead.
const combined = process.argv.includes("--combined");
const migrations = combined ? [] : readdirSync(join(root, "supabase/migrations")).filter((f) => f.endsWith(".sql")).sort();
for (const f of migrations) {
  try {
    await db.exec(readFileSync(join(root, "supabase/migrations", f), "utf8"));
    check(true, `migration ${f}`);
  } catch (e) {
    check(false, `migration ${f}: ${e.message}`);
  }
}
for (const f of combined ? ["setup-all.sql"] : ["seed.sql", "seed-cms.sql"]) {
  try {
    await db.exec(readFileSync(join(root, "supabase", f), "utf8"));
    check(true, `seed ${f}`);
  } catch (e) {
    check(false, `seed ${f}: ${e.code === "ENOENT" ? "missing" : e.message}`);
  }
}

await db.exec(`
  grant select, insert, update, delete on all tables in schema public to anon, authenticated;
  grant select, insert, update, delete on all tables in schema storage to anon, authenticated;
  grant usage, select on all sequences in schema public to authenticated;
`);

// Staff: one per role.
const users = {
  admin: "00000000-0000-0000-0000-00000000000a",
  editor: "00000000-0000-0000-0000-00000000000e",
  sales: "00000000-0000-0000-0000-00000000000s".replace("s", "5"),
};
for (const [role, id] of Object.entries(users)) {
  await db.query(`insert into auth.users (id, email) values ($1, $2)`, [id, `${role}@example.com`]);
  await db.query(`update public.profiles set role = $2, is_active = true where id = $1`, [id, role]);
}

/** Run `sql` as a role (anon, or a staff member via their JWT subject). */
async function as(who, sql, params = []) {
  await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false);");
  if (who === "anon") await db.exec("set role anon;");
  else {
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [users[who]]);
    await db.exec("set role authenticated;");
  }
  try {
    return { rows: (await db.query(sql, params)).rows, error: null };
  } catch (e) {
    return { rows: [], error: e.message };
  } finally {
    await db.exec("reset role;");
  }
}

// --- CMS ---------------------------------------------------------------
const pub = await as("anon", "select key from public.cms_pages");
check(!pub.error && pub.rows.length > 0, `anon reads published pages (${pub.rows.length})`);
check((await as("anon", "insert into public.cms_drafts (key, content) values ('home', '{}')")).error !== null, "anon cannot write drafts");
check((await as("anon", "select * from public.cms_drafts")).rows.length === 0, "anon sees no drafts");
check(
  !(await as("editor", `insert into public.cms_drafts (key, content, updated_by) values ('home', '{"hero":{}}', '${users.editor}')`)).error,
  "editor saves a draft",
);
check(
  (await as("sales", `insert into public.cms_drafts (key, content) values ('about', '{}')`)).error !== null,
  "sales cannot save drafts",
);
check(
  !(await as("editor", `update public.cms_pages set content = '{"hero":{"title":"x"}}', published_by = '${users.editor}' where key = 'home'`)).error,
  "editor publishes a page",
);
check(
  !(await as("editor", `insert into public.cms_revisions (key, content, created_by) values ('home', '{}', '${users.editor}')`)).error,
  "editor records a revision",
);
check(
  (await as("editor", `insert into public.cms_revisions (key, content, created_by) values ('home', '{}', '${users.admin}')`)).error !== null,
  "revision author must be the signed-in user",
);
const audit = await db.query("select row_id from public.audit_log where table_name = 'cms_pages' order by id desc limit 1");
check(audit.rows[0]?.row_id === "home", "audit log records CMS changes by page key");

// --- Media --------------------------------------------------------------
check(
  !(await as("editor", `insert into public.media_assets (path, file_name) values ('cms/a.png', 'a.png')`)).error,
  "editor adds a media asset",
);
check((await as("anon", "select * from public.media_assets")).rows.length === 1, "anon can read media metadata");
check(
  !(await as("editor", `insert into storage.objects (bucket_id, name) values ('site-media', 'cms/a.png')`)).error,
  "editor uploads to site-media",
);
check(
  (await as("sales", `insert into storage.objects (bucket_id, name) values ('site-media', 'cms/b.png')`)).error !== null,
  "sales cannot upload site media",
);

// --- Leads --------------------------------------------------------------
const insertLead = (who) =>
  as(
    who,
    `insert into public.enquiries (reference, type, name, email, source, priority, estimated_value, tags)
     values ('KI-261017-${who.slice(0, 4).toUpperCase()}', 'rfq', 'Test buyer', 'buyer@example.com', 'phone', 'high', 1200, '{pumps,kenya}') returning id`,
  );
const lead = await insertLead("sales");
check(!lead.error && lead.rows.length === 1, "sales adds a manual lead");
check((await insertLead("editor")).error !== null, "editor cannot add leads");
check((await insertLead("anon")).error !== null, "anon cannot insert leads directly");
const leadId = lead.rows[0]?.id;
const evt = await as(
  "sales",
  `insert into public.enquiry_events (enquiry_id, actor_id, kind, note) values ($1, $2, 'follow_up', 'Call back Monday')`,
  [leadId, users.sales],
);
check(!evt.error, "sales logs a follow-up event");
const touched = await db.query("select last_activity_at > created_at as moved from public.enquiries where id = $1", [leadId]);
check(touched.rows[0]?.moved === true, "logging activity bumps last_activity_at");
const noise = await db.query("select count(*)::int as n from public.audit_log where table_name = 'enquiries' and row_id = $1", [leadId]);
check(noise.rows[0]?.n === 0, "activity bump alone is not written to the audit log");
await as("sales", `update public.enquiries set priority = 'urgent' where id = $1`, [leadId]);
const real = await db.query("select count(*)::int as n from public.audit_log where table_name = 'enquiries' and row_id = $1", [leadId]);
check(real.rows[0]?.n === 1, "a real lead change is audited");
check(
  (await as("sales", `update public.enquiries set currency = 'usd' where id = $1`, [leadId])).error !== null,
  "currency must be an ISO code",
);
check((await as("editor", "select id from public.enquiries")).rows.length === 0, "editor cannot read leads");

console.log(`\n${failures ? `${failures} check(s) failed` : "All database checks passed"}`);
process.exit(failures ? 1 : 0);
