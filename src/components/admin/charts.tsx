import { cn } from "@/lib/utils";

/** Monthly bars: total enquiries with the won share darker. Pure HTML/CSS, with a text summary for screen readers. */
export function MonthBars({ data }: { data: { label: string; total: number; won: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.total));
  return (
    <figure>
      <div className="flex h-44 items-end gap-1.5" aria-hidden>
        {data.map((d) => (
          <div key={d.label} className="group flex h-full flex-1 flex-col justify-end" title={`${d.label}: ${d.total} enquiries, ${d.won} won`}>
            <span className="mb-1 text-center text-[0.65rem] tabular-nums text-muted opacity-0 transition-opacity group-hover:opacity-100">{d.total}</span>
            <div className="relative w-full overflow-hidden rounded-t bg-steel/30" style={{ height: `${(d.total / max) * 100}%`, minHeight: d.total ? 3 : 0 }}>
              <div className="absolute inset-x-0 bottom-0 bg-ink" style={{ height: d.total ? `${(d.won / d.total) * 100}%` : 0 }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5 text-center text-[0.65rem] text-muted" aria-hidden>
        {data.map((d) => (
          <span key={d.label} className="flex-1 truncate">
            {d.label}
          </span>
        ))}
      </div>
      <figcaption className="mt-3 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-steel/30" aria-hidden /> Enquiries
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-ink" aria-hidden /> Won
        </span>
        <span className="sr-only">{data.map((d) => `${d.label}: ${d.total} enquiries, ${d.won} won`).join("; ")}</span>
      </figcaption>
    </figure>
  );
}

/** Horizontal bars for a ranked list (countries, products, sources, stages). */
export function RankBars({ data, empty = "No data yet.", tone = "bg-bronze" }: { data: { label: string; value: number; note?: string }[]; empty?: string; tone?: string }) {
  if (!data.length) return <p className="py-6 text-center text-sm text-muted">{empty}</p>;
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="grid gap-2.5">
      {data.map((d) => (
        <li key={d.label} className="grid gap-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{d.label}</span>
            <span className="shrink-0 tabular-nums text-muted">
              {d.value}
              {d.note && <span className="ml-1.5 text-xs">{d.note}</span>}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-ink/[0.06]" aria-hidden>
            <div className={cn("h-full rounded-full", tone)} style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
