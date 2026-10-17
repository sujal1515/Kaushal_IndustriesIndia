"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { moveLead } from "@/app/admin/_actions/leads";
import { LEAD_STATUSES, formatMoney, priorityTone } from "@/lib/admin/leads";
import { cn, formatDate } from "@/lib/utils";
import { Pill } from "./ui";

export type BoardCard = {
  id: string;
  status: string;
  name: string;
  company: string | null;
  product: string | null;
  priority: string;
  owner: string | null;
  follow_up_at: string | null;
  estimated_value: number | null;
  currency: string;
  created_at: string;
};

const COLUMNS = LEAD_STATUSES.filter((s) => s.value !== "spam");

/** Pipeline: drag a card to another stage (or use its "Move to" menu). */
export function PipelineBoard({ cards: initial, now }: { cards: BoardCard[]; now: number }) {
  const router = useRouter();
  const [cards, setCards] = useState(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setCards(initial);
  }
  const [over, setOver] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const move = (id: string, status: string) => {
    const before = cards;
    const card = cards.find((c) => c.id === id);
    if (!card || card.status === status) return;
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, status } : c))); // optimistic
    setError(null);
    startTransition(async () => {
      const r = await moveLead(id, status);
      if (!r.ok) {
        setCards(before);
        setError(r.error ?? "Could not move the lead.");
      } else router.refresh();
    });
  };

  return (
    <>
      {error && <p className="mb-3 rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p>}
      <div className="-mx-4 overflow-x-auto px-4 pb-4">
        <div className="grid min-w-[1100px] grid-cols-5 gap-3">
          {COLUMNS.map((col) => {
            const list = cards.filter((c) => c.status === col.value);
            const total = list.reduce((sum, c) => sum + (c.currency === "USD" && c.estimated_value ? c.estimated_value : 0), 0);
            return (
              <section
                key={col.value}
                aria-label={col.label}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(col.value);
                }}
                onDragLeave={() => setOver((o) => (o === col.value ? null : o))}
                onDrop={(e) => {
                  e.preventDefault();
                  setOver(null);
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) move(id, col.value);
                }}
                className={cn("flex min-h-[60vh] flex-col rounded-xl border bg-paper transition-colors", over === col.value ? "border-ink/40 bg-accent-soft/40" : "border-line")}
              >
                <header className="border-b border-line px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold">{col.label}</h2>
                    <span className="rounded-full bg-ink/[0.06] px-2 text-xs font-medium text-ink-soft">{list.length}</span>
                  </div>
                  <p className="text-xs text-muted">{total ? `${formatMoney(total, "USD")} (USD)` : col.hint}</p>
                </header>
                <ul className="grid content-start gap-2 p-2">
                  {list.map((c) => {
                    const overdue = c.follow_up_at && new Date(c.follow_up_at).getTime() < now && ["new", "contacted", "quoted"].includes(c.status);
                    return (
                      <li
                        key={c.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", c.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        className="cursor-grab rounded-lg border border-line bg-surface p-3 text-sm shadow-sm active:cursor-grabbing"
                      >
                        <Link href={`/admin/enquiries/${c.id}`} className="font-medium hover:underline">
                          {c.name}
                        </Link>
                        {c.company && <p className="truncate text-xs text-muted">{c.company}</p>}
                        {c.product && <p className="mt-1.5 line-clamp-2 text-xs">{c.product}</p>}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {c.priority !== "normal" && <Pill tone={priorityTone(c.priority)}>{c.priority}</Pill>}
                          {c.estimated_value !== null && <span className="text-xs font-medium tabular-nums">{formatMoney(c.estimated_value, c.currency)}</span>}
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted">
                          <span className="truncate">{c.owner ?? "Unassigned"}</span>
                          {c.follow_up_at ? <span className={cn(overdue && "font-medium text-danger")}>↻ {formatDate(c.follow_up_at)}</span> : <span>{formatDate(c.created_at)}</span>}
                        </div>
                        <label className="mt-2 block">
                          <span className="sr-only">Move {c.name} to</span>
                          <select value={c.status} onChange={(e) => move(c.id, e.target.value)} className="w-full rounded-md border border-line bg-paper px-2 py-1 text-xs text-ink-soft">
                            {LEAD_STATUSES.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.value === c.status ? `In ${s.label}` : `Move to ${s.label}`}
                              </option>
                            ))}
                          </select>
                        </label>
                      </li>
                    );
                  })}
                  {!list.length && <li className="px-2 py-6 text-center text-xs text-muted">Drop leads here</li>}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
