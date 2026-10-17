import Link from "next/link";
import type { Metadata } from "next";
import { ENQUIRY_ROLES, hasRole, requireStaff } from "@/lib/admin/auth";
import { createSessionClient } from "@/lib/supabase/clients";
import { AdminHeader, adminButton } from "@/components/admin/ui";
import { NoAccess } from "@/components/admin/no-access";
import { PipelineBoard, type BoardCard } from "@/components/admin/pipeline-board";
import { cn } from "@/lib/utils";
import { requestTime } from "@/lib/admin/dates";

export const metadata: Metadata = { title: "Pipeline" };

export default async function BoardPage({ searchParams }: PageProps<"/admin/enquiries/board">) {
  const staff = await requireStaff();
  if (!hasRole(staff, ENQUIRY_ROLES)) return <NoAccess />;
  const sp = await searchParams;
  const mine = sp.owner === "me";

  // Every open lead, plus leads closed (won / lost) in the last 90 days.
  const now = requestTime();
  const since = new Date(now - 90 * 24 * 3600 * 1000).toISOString();
  const supabase = await createSessionClient();
  let q = supabase
    .from("enquiries")
    .select("id, status, name, company, product_name_snapshot, priority, assigned_to, follow_up_at, estimated_value, currency, created_at")
    .neq("status", "spam")
    .or(`status.in.(new,contacted,quoted),updated_at.gte.${since}`)
    .order("created_at", { ascending: false })
    .limit(600);
  if (mine) q = q.eq("assigned_to", staff.id);
  const [{ data, error }, { data: people }] = await Promise.all([q, supabase.from("profiles").select("id, full_name, email")]);
  const names = new Map((people ?? []).map((p) => [p.id as string, (p.full_name || p.email) as string]));
  const cards: BoardCard[] = (data ?? []).map((e) => ({
    id: e.id,
    status: e.status,
    name: e.name,
    company: e.company,
    product: e.product_name_snapshot,
    priority: e.priority,
    owner: e.assigned_to ? (names.get(e.assigned_to) ?? null) : null,
    follow_up_at: e.follow_up_at,
    estimated_value: e.estimated_value === null ? null : Number(e.estimated_value),
    currency: e.currency,
    created_at: e.created_at,
  }));

  return (
    <>
      <AdminHeader
        title="Pipeline"
        description="Open leads by stage, plus anything won or lost in the last 90 days. Drag a card to move it; every move is logged."
        actions={
          <>
            <div className="flex rounded-lg border border-line text-sm">
              <Link href="/admin/enquiries/board" className={cn("rounded-l-lg px-3 py-1.5", !mine ? "bg-ink text-white" : "text-muted hover:text-ink")}>
                Everyone
              </Link>
              <Link href="/admin/enquiries/board?owner=me" className={cn("rounded-r-lg px-3 py-1.5", mine ? "bg-ink text-white" : "text-muted hover:text-ink")}>
                Mine
              </Link>
            </div>
            <Link href="/admin/enquiries/new" className={adminButton("primary")}>
              + Add lead
            </Link>
          </>
        }
      />
      {error && <p className="mb-4 rounded-lg bg-danger-soft p-3 text-sm text-danger">{error.message}</p>}
      <PipelineBoard cards={cards} now={now} />
    </>
  );
}
