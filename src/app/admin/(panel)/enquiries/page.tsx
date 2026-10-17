import Link from "next/link";
import type { Metadata } from "next";
import { ENQUIRY_ROLES, hasRole, requireStaff } from "@/lib/admin/auth";
import { createSessionClient } from "@/lib/supabase/clients";
import { applyEnquiryFilters, applyEnquirySort, parseFilters } from "@/lib/admin/enquiry-query";
import { LEAD_STATUSES, PRIORITIES, SOURCES } from "@/lib/admin/leads";
import { countryName } from "@/lib/enquiry/options";
import { AdminHeader, Input, Select, adminButton } from "@/components/admin/ui";
import { NoAccess } from "@/components/admin/no-access";
import { LeadsTable, type LeadRow } from "@/components/admin/leads-table";
import { requestTime } from "@/lib/admin/dates";

export const metadata: Metadata = { title: "Enquiries" };

const PAGE_SIZE = 25;

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
      "id, reference, created_at, type, status, priority, name, company, email, product_name_snapshot, model_code_snapshot, quantity, quantity_unit, destination_country, buyer_country, notify_error, assigned_to, follow_up_at, estimated_value, currency, tags",
      { count: "exact" },
    );
  const [{ data, count, error }, { data: people }] = await Promise.all([
    applyEnquirySort(applyEnquiryFilters(base, filters, staff.id), filters.sort).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    supabase.from("profiles").select("id, full_name, email, role").eq("is_active", true).order("full_name"),
  ]);
  const team = (people ?? []).filter((p) => p.role !== "editor").map((p) => ({ id: p.id as string, name: (p.full_name || p.email) as string }));
  const names = new Map(team.map((p) => [p.id, p.name]));

  type Raw = Omit<LeadRow, "country" | "owner"> & { destination_country: string | null; buyer_country: string | null; assigned_to: string | null };
  const rows: LeadRow[] = ((data ?? []) as Raw[]).map((e) => ({
    ...e,
    country: countryName(e.destination_country || e.buyer_country) || "",
    owner: e.assigned_to ? (names.get(e.assigned_to) ?? "Former staff") : null,
    tags: (e.tags as string[] | null) ?? [],
  }));
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const qs = (extra: Record<string, string | number>) => {
    const p = new URLSearchParams();
    Object.entries({ ...filters, ...extra }).forEach(([k, v]) => v && p.set(k, String(v)));
    return `?${p.toString()}`;
  };
  const exportQs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]).toString();
  const quick = [
    { label: "My open leads", href: "?owner=me&status=open" },
    { label: "New", href: "?status=new" },
    { label: "Overdue follow-ups", href: "?follow=overdue&status=open" },
    { label: "Unassigned", href: "?owner=none&status=open" },
    { label: "High priority", href: "?priority=high&status=open" },
  ];

  return (
    <>
      <AdminHeader
        title="Enquiries"
        description={`${count ?? 0} matching enquir${count === 1 ? "y" : "ies"}. Spam is hidden unless you filter for it.`}
        actions={
          <>
            <a href={`/admin/enquiries/export${exportQs ? `?${exportQs}` : ""}`} className={adminButton("secondary")}>
              Export CSV
            </a>
            <Link href="/admin/enquiries/new" className={adminButton("primary")}>
              + Add lead
            </Link>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap gap-2">
        {quick.map((q) => (
          <Link key={q.label} href={q.href} className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-soft hover:border-ink/40 hover:text-ink">
            {q.label}
          </Link>
        ))}
        {Object.values(filters).some(Boolean) && (
          <Link href="/admin/enquiries" className="rounded-full px-3 py-1 text-xs text-accent hover:underline">
            Clear filters
          </Link>
        )}
      </div>

      <form method="get" className="mb-6 grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input name="q" defaultValue={filters.q} placeholder="Search name, email, phone, ref, product…" className="sm:col-span-2" aria-label="Search" />
        <Select name="status" defaultValue={filters.status} aria-label="Stage">
          <option value="">All stages (excl. spam)</option>
          <option value="open">Open (new, contacted, quoted)</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Select name="type" defaultValue={filters.type} aria-label="Type">
          <option value="">All types</option>
          <option value="rfq">RFQ</option>
          <option value="distributor">Distributor</option>
          <option value="contact">Contact</option>
        </Select>
        <Select name="priority" defaultValue={filters.priority} aria-label="Priority">
          <option value="">Any priority</option>
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
        <Select name="owner" defaultValue={filters.owner} aria-label="Owner">
          <option value="">Anyone</option>
          <option value="me">Assigned to me</option>
          <option value="none">Unassigned</option>
          {team.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Select name="source" defaultValue={filters.source} aria-label="Source">
          <option value="">Any source</option>
          {SOURCES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Select name="follow" defaultValue={filters.follow} aria-label="Follow-up">
          <option value="">Any follow-up</option>
          <option value="overdue">Overdue</option>
          <option value="today">Due today</option>
          <option value="upcoming">Upcoming</option>
          <option value="none">None set</option>
        </Select>
        <Input type="date" name="from" defaultValue={filters.from} aria-label="Received from" />
        <Input type="date" name="to" defaultValue={filters.to} aria-label="Received to" />
        <Select name="sort" defaultValue={filters.sort} aria-label="Sort">
          <option value="">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="activity">Recent activity</option>
          <option value="follow_up">Follow-up date</option>
          <option value="value">Highest value</option>
        </Select>
        {filters.tag && <input type="hidden" name="tag" value={filters.tag} />}
        <button type="submit" className={adminButton("primary")}>
          Apply filters
        </button>
      </form>

      {error && <p className="mb-4 rounded-lg bg-danger-soft p-3 text-sm text-danger">{error.message}</p>}
      {filters.tag && (
        <p className="mb-3 text-sm text-muted">
          Tagged <strong className="text-ink">#{filters.tag}</strong> ·{" "}
          <Link href={qs({ tag: "" })} className="text-accent hover:underline">
            remove
          </Link>
        </p>
      )}

      <LeadsTable rows={rows} staff={team} canDelete={staff.role === "admin"} now={requestTime()} />

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={qs({ page: page - 1 })} className={adminButton("secondary")}>← Previous</Link> : <span />}
          <span className="text-muted">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? <Link href={qs({ page: page + 1 })} className={adminButton("secondary")}>Next →</Link> : <span />}
        </nav>
      )}
    </>
  );
}
