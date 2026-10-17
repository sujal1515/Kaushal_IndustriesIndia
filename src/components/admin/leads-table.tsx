"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bulkUpdateLeads } from "@/app/admin/_actions/leads";
import { LEAD_STATUSES, PRIORITIES, formatMoney, priorityTone, statusLabel } from "@/lib/admin/leads";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { Pill, enquiryTone, inputClass } from "./ui";

export type LeadRow = {
  id: string;
  reference: string;
  created_at: string;
  type: string;
  status: string;
  priority: string;
  name: string;
  company: string | null;
  email: string;
  product_name_snapshot: string | null;
  model_code_snapshot: string | null;
  quantity: number | null;
  quantity_unit: string | null;
  country: string;
  owner: string | null;
  follow_up_at: string | null;
  estimated_value: number | null;
  currency: string;
  notify_error: string | null;
  tags: string[];
};

export function LeadsTable({ rows, staff, canDelete, now }: { rows: LeadRow[]; staff: { id: string; name: string }[]; canDelete: boolean; now: number }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const all = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const apply = (change: Parameters<typeof bulkUpdateLeads>[1], confirm?: string) => {
    if (confirm && !window.confirm(confirm)) return;
    startTransition(async () => {
      const r = await bulkUpdateLeads([...selected], change);
      setMessage({ ok: !!r.ok, text: r.ok ? (r.message ?? "Done") : (r.error ?? "Failed") });
      if (r.ok) {
        setSelected(new Set());
        router.refresh();
      }
    });
  };

  return (
    <>
      {selected.size > 0 && (
        <div className="sticky top-2 z-20 mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-ink/20 bg-ink px-4 py-2.5 text-sm text-white shadow-lg">
          <span className="mr-2 font-medium">{selected.size} selected</span>
          <select aria-label="Set stage" className={cn(inputClass, "!h-8 !w-auto !py-0 text-ink")} value="" disabled={pending} onChange={(e) => e.target.value && apply({ status: e.target.value })}>
            <option value="">Move to stage…</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select aria-label="Set priority" className={cn(inputClass, "!h-8 !w-auto !py-0 text-ink")} value="" disabled={pending} onChange={(e) => e.target.value && apply({ priority: e.target.value })}>
            <option value="">Set priority…</option>
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Assign"
            className={cn(inputClass, "!h-8 !w-auto !py-0 text-ink")}
            value=""
            disabled={pending}
            onChange={(e) => e.target.value && apply({ assigned_to: e.target.value === "none" ? "" : e.target.value })}
          >
            <option value="">Assign to…</option>
            <option value="none">Unassigned</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {canDelete && (
            <button type="button" disabled={pending} className="rounded-lg px-3 py-1.5 text-red-200 hover:bg-white/10" onClick={() => apply({ delete: true }, `Permanently delete ${selected.size} enquiries? This cannot be undone.`)}>
              Delete
            </button>
          )}
          <button type="button" className="ml-auto rounded-lg px-3 py-1.5 hover:bg-white/10" onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      )}
      {message && (
        <p role="status" className={cn("mb-3 text-sm", message.ok ? "text-accent" : "text-danger")}>
          {message.ok ? `✓ ${message.text}` : message.text}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[960px] border-collapse text-sm [&_td]:border-t [&_td]:border-line [&_td]:px-3 [&_td]:py-3 [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted">
          <thead>
            <tr>
              <th className="w-8">
                <input type="checkbox" aria-label="Select all" checked={all} onChange={() => setSelected(all ? new Set() : new Set(rows.map((r) => r.id)))} className="h-4 w-4 accent-[var(--color-ink)]" />
              </th>
              <th>Lead</th>
              <th>Requirement</th>
              <th>Country</th>
              <th>Stage</th>
              <th>Owner</th>
              <th>Follow-up</th>
              <th className="text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => {
              const overdue = e.follow_up_at && new Date(e.follow_up_at).getTime() < now && ["new", "contacted", "quoted"].includes(e.status);
              return (
                <tr key={e.id} className={cn("align-top hover:bg-paper", selected.has(e.id) && "bg-accent-soft/40")}>
                  <td>
                    <input type="checkbox" aria-label={`Select ${e.name}`} checked={selected.has(e.id)} onChange={() => toggle(e.id)} className="h-4 w-4 accent-[var(--color-ink)]" />
                  </td>
                  <td>
                    <Link href={`/admin/enquiries/${e.id}`} className="font-medium hover:underline">
                      {e.name}
                    </Link>
                    <span className="block text-xs text-muted">{e.company || e.email}</span>
                    <span className="mt-0.5 block font-mono text-[0.7rem] text-muted">
                      {e.reference} · {formatDateTime(e.created_at)}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs uppercase tracking-wide text-muted">{e.type}</span>
                    <span className="block">
                      {e.product_name_snapshot ?? "—"}
                      {e.model_code_snapshot && <span className="font-mono text-xs"> · {e.model_code_snapshot}</span>}
                    </span>
                    {e.quantity && (
                      <span className="block text-xs text-muted">
                        {e.quantity} {e.quantity_unit}
                      </span>
                    )}
                    {e.tags.length > 0 && (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {e.tags.map((t) => (
                          <Link key={t} href={`/admin/enquiries?tag=${encodeURIComponent(t)}`} className="rounded bg-ink/[0.06] px-1.5 py-0.5 text-[0.7rem] text-ink-soft hover:bg-ink/10">
                            #{t}
                          </Link>
                        ))}
                      </span>
                    )}
                  </td>
                  <td>{e.country || "—"}</td>
                  <td className="whitespace-nowrap">
                    <span className="flex flex-col items-start gap-1">
                      <Pill tone={enquiryTone(e.status)}>{statusLabel(e.status)}</Pill>
                      {e.priority !== "normal" && <Pill tone={priorityTone(e.priority)}>{e.priority}</Pill>}
                      {e.notify_error && <Pill tone="danger">email failed</Pill>}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">{e.owner ?? <span className="text-muted">—</span>}</td>
                  <td className={cn("whitespace-nowrap", overdue ? "font-medium text-danger" : "text-muted")}>{e.follow_up_at ? formatDate(e.follow_up_at) : "—"}</td>
                  <td className="whitespace-nowrap text-right tabular-nums">{formatMoney(e.estimated_value, e.currency) ?? <span className="text-muted">—</span>}</td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={8} className="py-10 text-center text-muted">
                  No enquiries match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pending && <p className="mt-2 text-xs text-muted">Working…</p>}
    </>
  );
}
