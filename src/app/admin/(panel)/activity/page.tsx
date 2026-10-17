import Link from "next/link";
import type { Metadata } from "next";
import { requireStaff } from "@/lib/admin/auth";
import { createSessionClient } from "@/lib/supabase/clients";
import { formatDateTime } from "@/lib/utils";
import { AdminHeader, Pill, Select, Table, adminButton } from "@/components/admin/ui";
import { NoAccess } from "@/components/admin/no-access";

export const metadata: Metadata = { title: "Activity log" };

const PAGE_SIZE = 50;
const TABLES: Record<string, string> = {
  cms_pages: "Page content",
  media_assets: "Media",
  products: "Products",
  categories: "Categories",
  applications: "Applications",
  resources: "Resources",
  faqs: "FAQs",
  enquiries: "Enquiries",
  site_settings: "Settings",
  profiles: "Users",
};
const IGNORED = new Set(["updated_at", "search_vector", "last_activity_at"]);

type Row = {
  id: number;
  actor_id: string | null;
  table_name: string;
  row_id: string | null;
  action: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
};

/** Field names that changed between two snapshots. */
function changedFields(r: Row) {
  if (r.action !== "UPDATE" || !r.old_data || !r.new_data) return [];
  return Object.keys(r.new_data).filter((k) => !IGNORED.has(k) && JSON.stringify(r.old_data![k]) !== JSON.stringify(r.new_data![k]));
}

function describe(r: Row) {
  const d = r.new_data ?? r.old_data ?? {};
  return (d.name ?? d.title ?? d.key ?? d.reference ?? d.file_name ?? d.email ?? d.question ?? r.row_id ?? "") as string;
}

function href(r: Row) {
  const id = r.row_id;
  if (!id || r.action === "DELETE") return null;
  const map: Record<string, string> = {
    cms_pages: `/admin/content/${id}`,
    products: `/admin/products/${id}`,
    categories: `/admin/categories/${id}`,
    applications: `/admin/applications/${id}`,
    resources: `/admin/resources/${id}`,
    enquiries: `/admin/enquiries/${id}`,
    media_assets: "/admin/media",
    site_settings: "/admin/settings",
    profiles: "/admin/users",
    faqs: "/admin/faqs",
  };
  return map[r.table_name] ?? null;
}

export default async function ActivityPage({ searchParams }: PageProps<"/admin/activity">) {
  const staff = await requireStaff();
  if (staff.role !== "admin") return <NoAccess />;
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const table = one(sp.table);
  const action = one(sp.action);
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const supabase = await createSessionClient();
  let query = supabase.from("audit_log").select("*", { count: "exact" });
  if (table in TABLES) query = query.eq("table_name", table);
  if (["INSERT", "UPDATE", "DELETE"].includes(action)) query = query.eq("action", action);
  const [{ data, count, error }, { data: people }] = await Promise.all([
    query.order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    supabase.from("profiles").select("id, full_name, email"),
  ]);
  const names = new Map((people ?? []).map((p) => [p.id as string, (p.full_name || p.email) as string]));
  const rows = (data ?? []) as Row[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const qs = (p: number) => `?${new URLSearchParams({ ...(table ? { table } : {}), ...(action ? { action } : {}), page: String(p) })}`;

  return (
    <>
      <AdminHeader title="Activity log" description="Every change to content, catalogue, leads, settings and users — who made it and when." />
      <form method="get" className="mb-6 flex flex-wrap gap-3 rounded-xl border border-line bg-surface p-4">
        <Select name="table" defaultValue={table} aria-label="Area" className="!w-48">
          <option value="">All areas</option>
          {Object.entries(TABLES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <Select name="action" defaultValue={action} aria-label="Change" className="!w-40">
          <option value="">All changes</option>
          <option value="INSERT">Created</option>
          <option value="UPDATE">Updated</option>
          <option value="DELETE">Deleted</option>
        </Select>
        <button type="submit" className={adminButton("primary")}>
          Filter
        </button>
      </form>
      {error && <p className="mb-4 rounded-lg bg-danger-soft p-3 text-sm text-danger">{error.message}</p>}
      <Table>
        <thead>
          <tr>
            <th>When</th>
            <th>Who</th>
            <th>Area</th>
            <th>Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const fields = changedFields(r);
            const link = href(r);
            const label = describe(r);
            return (
              <tr key={r.id} className="align-top">
                <td className="whitespace-nowrap text-muted">{formatDateTime(r.created_at)}</td>
                <td>{r.actor_id ? (names.get(r.actor_id) ?? "Staff member") : <span className="text-muted">System / website</span>}</td>
                <td>{TABLES[r.table_name] ?? r.table_name}</td>
                <td>
                  <span className="flex flex-wrap items-center gap-2">
                    <Pill tone={r.action === "DELETE" ? "danger" : r.action === "INSERT" ? "accent" : "neutral"}>
                      {r.action === "INSERT" ? "created" : r.action === "DELETE" ? "deleted" : "updated"}
                    </Pill>
                    {link ? (
                      <Link href={link} className="font-medium hover:underline">
                        {label}
                      </Link>
                    ) : (
                      <span className="font-medium">{label}</span>
                    )}
                  </span>
                  {fields.length > 0 && <span className="mt-1 block text-xs text-muted">Changed: {fields.slice(0, 8).join(", ")}{fields.length > 8 ? "…" : ""}</span>}
                </td>
              </tr>
            );
          })}
          {!rows.length && (
            <tr>
              <td colSpan={4} className="py-10 text-center text-muted">
                No activity recorded.
              </td>
            </tr>
          )}
        </tbody>
      </Table>
      {totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={qs(page - 1)} className={adminButton("secondary")}>← Newer</Link> : <span />}
          <span className="text-muted">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? <Link href={qs(page + 1)} className={adminButton("secondary")}>Older →</Link> : <span />}
        </nav>
      )}
    </>
  );
}
