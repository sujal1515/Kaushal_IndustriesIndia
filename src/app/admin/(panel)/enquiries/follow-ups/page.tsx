import Link from "next/link";
import type { Metadata } from "next";
import { ENQUIRY_ROLES, hasRole, requireStaff } from "@/lib/admin/auth";
import { createSessionClient } from "@/lib/supabase/clients";
import { istDayBounds } from "@/lib/admin/dates";
import { formatMoney, priorityTone, statusLabel } from "@/lib/admin/leads";
import { formatDateTime } from "@/lib/utils";
import { AdminHeader, Empty, Pill, enquiryTone } from "@/components/admin/ui";
import { NoAccess } from "@/components/admin/no-access";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Follow-ups" };

type Row = {
  id: string;
  name: string;
  company: string | null;
  status: string;
  priority: string;
  follow_up_at: string;
  product_name_snapshot: string | null;
  estimated_value: number | null;
  currency: string;
  assigned_to: string | null;
};

export default async function FollowUpsPage({ searchParams }: PageProps<"/admin/enquiries/follow-ups">) {
  const staff = await requireStaff();
  if (!hasRole(staff, ENQUIRY_ROLES)) return <NoAccess />;
  const sp = await searchParams;
  const everyone = sp.owner === "all";
  const today = istDayBounds();
  const week = istDayBounds(7);

  const supabase = await createSessionClient();
  let q = supabase
    .from("enquiries")
    .select("id, name, company, status, priority, follow_up_at, product_name_snapshot, estimated_value, currency, assigned_to")
    .not("follow_up_at", "is", null)
    .in("status", ["new", "contacted", "quoted"])
    .lte("follow_up_at", week.end)
    .order("follow_up_at", { ascending: true })
    .limit(500);
  if (!everyone) q = q.eq("assigned_to", staff.id);
  const [{ data, error }, { data: people }] = await Promise.all([q, supabase.from("profiles").select("id, full_name, email")]);
  const names = new Map((people ?? []).map((p) => [p.id as string, (p.full_name || p.email) as string]));
  const rows = (data ?? []) as Row[];
  const t = (iso: string) => new Date(iso).getTime();
  const [dayStart, dayEnd] = [t(today.start), t(today.end)];
  const groups = [
    { label: "Overdue", tone: "text-danger", items: rows.filter((r) => t(r.follow_up_at) < dayStart) },
    { label: "Today", tone: "text-ink", items: rows.filter((r) => t(r.follow_up_at) >= dayStart && t(r.follow_up_at) <= dayEnd) },
    { label: "Next 7 days", tone: "text-muted", items: rows.filter((r) => t(r.follow_up_at) > dayEnd) },
  ];

  return (
    <>
      <AdminHeader
        title="Follow-ups"
        description="Open leads with a follow-up date — set one on any enquiry under “Lead details”."
        actions={
          <div className="flex rounded-lg border border-line text-sm">
            <Link href="/admin/enquiries/follow-ups" className={cn("rounded-l-lg px-3 py-1.5", !everyone ? "bg-ink text-white" : "text-muted hover:text-ink")}>
              Mine
            </Link>
            <Link href="/admin/enquiries/follow-ups?owner=all" className={cn("rounded-r-lg px-3 py-1.5", everyone ? "bg-ink text-white" : "text-muted hover:text-ink")}>
              Everyone
            </Link>
          </div>
        }
      />
      {error && <p className="mb-4 rounded-lg bg-danger-soft p-3 text-sm text-danger">{error.message}</p>}
      {rows.length ? (
        <div className="grid gap-8">
          {groups
            .filter((g) => g.items.length)
            .map((g) => (
              <section key={g.label}>
                <h2 className={cn("mb-3 text-sm font-semibold", g.tone)}>
                  {g.label} · {g.items.length}
                </h2>
                <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                  {g.items.map((r) => (
                    <li key={r.id}>
                      <Link href={`/admin/enquiries/${r.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 text-sm hover:bg-paper">
                        <span className={cn("w-40 shrink-0 font-medium", g.tone)}>{formatDateTime(r.follow_up_at)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="font-medium">{r.name}</span>
                          {r.company && <span className="text-muted"> · {r.company}</span>}
                          {r.product_name_snapshot && <span className="block truncate text-xs text-muted">{r.product_name_snapshot}</span>}
                        </span>
                        {r.priority !== "normal" && <Pill tone={priorityTone(r.priority)}>{r.priority}</Pill>}
                        <Pill tone={enquiryTone(r.status)}>{statusLabel(r.status)}</Pill>
                        {r.estimated_value !== null && <span className="tabular-nums text-muted">{formatMoney(Number(r.estimated_value), r.currency)}</span>}
                        {everyone && <span className="text-xs text-muted">{r.assigned_to ? names.get(r.assigned_to) : "Unassigned"}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
        </div>
      ) : (
        <Empty>Nothing due in the next seven days{everyone ? "" : " for you"}.</Empty>
      )}
    </>
  );
}
