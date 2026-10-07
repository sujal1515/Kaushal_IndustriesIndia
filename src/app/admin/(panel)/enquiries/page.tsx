import Link from "next/link";
import type { Metadata } from "next";
import { ENQUIRY_ROLES, hasRole, requireStaff } from "@/lib/admin/auth";
import { createSessionClient } from "@/lib/supabase/clients";
import { applyEnquiryFilters, parseFilters } from "@/lib/admin/enquiry-query";
import { countryName } from "@/lib/enquiry/options";
import { formatDateTime } from "@/lib/utils";
import { AdminHeader, Input, Pill, Select, Table, adminButton, enquiryTone } from "@/components/admin/ui";
import { NoAccess } from "@/components/admin/no-access";

export const metadata: Metadata = { title: "Enquiries" };

const PAGE_SIZE = 25;

type EnquiryRow = {
  id: string;
  reference: string;
  created_at: string;
  type: string;
  status: string;
  name: string;
  company: string | null;
  email: string;
  product_name_snapshot: string | null;
  model_code_snapshot: string | null;
  quantity: number | null;
  quantity_unit: string | null;
  destination_country: string | null;
  buyer_country: string | null;
  notify_error: string | null;
};

export default async function EnquiriesPage({ searchParams }: PageProps<"/admin/enquiries">) {
  const staff = await requireStaff();
  if (!hasRole(staff, ENQUIRY_ROLES)) return <NoAccess />;
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const page = Math.max(1, Number(Array.isArray(sp.page) ? sp.page[0] : sp.page) || 1);

  const supabase = await createSessionClient();
  const base = supabase
    .from("enquiries")
    .select(
      "id, reference, created_at, type, status, name, company, email, product_name_snapshot, model_code_snapshot, quantity, quantity_unit, destination_country, buyer_country, notify_error",
      { count: "exact" },
    );
  const { data, count, error } = await applyEnquiryFilters(base, filters)
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const rows = (data ?? []) as EnquiryRow[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const qs = (extra: Record<string, string | number>) => {
    const p = new URLSearchParams();
    Object.entries({ ...filters, ...extra }).forEach(([k, v]) => v && p.set(k, String(v)));
    return `?${p.toString()}`;
  };
  const exportQs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <>
      <AdminHeader
        title="Enquiries"
        description={`${count ?? 0} matching enquir${count === 1 ? "y" : "ies"}. Spam is hidden unless you filter for it.`}
        actions={
          <a href={`/admin/enquiries/export${exportQs ? `?${exportQs}` : ""}`} className={adminButton("secondary")}>
            Export CSV
          </a>
        }
      />

      <form method="get" className="mb-6 grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-6">
        <Input name="q" defaultValue={filters.q} placeholder="Search name, email, ref, product…" className="lg:col-span-2" aria-label="Search" />
        <Select name="type" defaultValue={filters.type} aria-label="Type">
          <option value="">All types</option>
          <option value="rfq">RFQ</option>
          <option value="distributor">Distributor</option>
          <option value="contact">Contact</option>
        </Select>
        <Select name="status" defaultValue={filters.status} aria-label="Status">
          <option value="">All (excl. spam)</option>
          {["new", "contacted", "quoted", "won", "lost", "spam"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Input type="date" name="from" defaultValue={filters.from} aria-label="From date" />
        <div className="flex gap-2">
          <Input type="date" name="to" defaultValue={filters.to} aria-label="To date" />
          <button type="submit" className={adminButton("primary")}>
            Filter
          </button>
        </div>
      </form>

      {error && <p className="mb-4 rounded-lg bg-danger-soft p-3 text-sm text-danger">{error.message}</p>}

      <Table>
        <thead>
          <tr>
            <th>Ref / received</th>
            <th>From</th>
            <th>Requirement</th>
            <th>Country</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id} className="hover:bg-paper">
              <td className="whitespace-nowrap">
                <Link href={`/admin/enquiries/${e.id}`} className="font-mono text-xs font-medium hover:underline">
                  {e.reference}
                </Link>
                <span className="block text-xs text-muted">{formatDateTime(e.created_at)}</span>
              </td>
              <td>
                <Link href={`/admin/enquiries/${e.id}`} className="font-medium hover:underline">
                  {e.name}
                </Link>
                <span className="block text-xs text-muted">{e.company || e.email}</span>
              </td>
              <td>
                <span className="text-xs uppercase tracking-wide text-muted">{e.type}</span>
                <span className="block">
                  {e.product_name_snapshot ?? "—"}
                  {e.model_code_snapshot && <span className="font-mono text-xs"> · {e.model_code_snapshot}</span>}
                </span>
                {e.quantity && <span className="block text-xs text-muted">{e.quantity} {e.quantity_unit}</span>}
              </td>
              <td>{countryName(e.destination_country || e.buyer_country) || "—"}</td>
              <td className="whitespace-nowrap">
                <Pill tone={enquiryTone(e.status)}>{e.status}</Pill>
                {e.notify_error && (
                  <span className="mt-1 block">
                    <Pill tone="danger">email failed</Pill>
                  </span>
                )}
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={5} className="py-10 text-center text-muted">
                No enquiries match these filters.
              </td>
            </tr>
          )}
        </tbody>
      </Table>

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={qs({ page: page - 1 })} className={adminButton("secondary")}>← Newer</Link> : <span />}
          <span className="text-muted">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? <Link href={qs({ page: page + 1 })} className={adminButton("secondary")}>Older →</Link> : <span />}
        </nav>
      )}
    </>
  );
}
