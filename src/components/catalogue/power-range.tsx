"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowRight } from "@/components/ui/icons";

export type PowerModel = { code: string; bhp: number; rpm: number | null };
export type PowerFamily = { name: string; href: string; models: PowerModel[] };

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(Number(n.toFixed(1))));

/**
 * "Rated power" at a glance: every engine family drawn on one bhp scale, each model a tick.
 * Drag the marker to the power you need — models that meet it light up, each family shows its
 * nearest match, and "Find a model by power" opens the model finder already filtered.
 */
export function PowerRange({
  families,
  finderHref,
  label = "Rated power",
  unit = "bhp",
  cta = "Find a model by power",
}: {
  families: PowerFamily[];
  finderHref: string;
  label?: string;
  unit?: string;
  cta?: string;
}) {
  const id = useId();
  // The slider steps through the ratings that actually exist, so every stop is a real model.
  const ratings = useMemo(() => [...new Set(families.flatMap((f) => f.models.map((m) => m.bhp)))].sort((a, b) => a - b), [families]);
  const min = ratings[0];
  const max = ratings[ratings.length - 1];
  const scaleMax = Math.ceil((max + 2) / 5) * 5;
  const ticks = useMemo(() => Array.from({ length: scaleMax / 5 + 1 }, (_, i) => i * 5), [scaleMax]);
  const [step, setStep] = useState(() => Math.max(0, ratings.findIndex((r) => r >= 10)));
  const need = ratings[step];
  const pos = (v: number) => `${(v / scaleMax) * 100}%`;
  const matches = families.reduce((n, f) => n + f.models.filter((m) => m.bhp >= need).length, 0);

  return (
    <div className="w-full overflow-x-clip">
      {/* Control */}
      <div className="flex flex-col gap-6 border-y border-line py-6 md:flex-row md:items-center md:justify-between">
        <label htmlFor={`${id}-need`} className="flex items-baseline gap-4">
          <span className="eyebrow">{label}</span>
          <output htmlFor={`${id}-need`} className="text-[2.5rem] font-bold leading-none tracking-[-0.05em] tabular-nums">
            {fmt(need)}
            <span className="ml-1.5 text-[1.125rem] font-medium tracking-normal text-muted">{unit}</span>
          </output>
        </label>
        <div className="flex flex-1 items-center gap-4 md:max-w-[28rem]">
          <span className="font-mono text-[0.8125rem] text-muted">{fmt(min)}</span>
          <input
            id={`${id}-need`}
            type="range"
            min={0}
            max={ratings.length - 1}
            step={1}
            value={step}
            onChange={(e) => setStep(Number(e.target.value))}
            className="power-slider w-full"
            aria-valuetext={`${fmt(need)} ${unit}`}
          />
          <span className="font-mono text-[0.8125rem] text-muted">{fmt(max)}</span>
        </div>
        <Link href={`${finderHref}${finderHref.includes("?") ? "&" : "?"}power_bhp_min=${need}#model-finder`} className="group inline-flex items-center gap-2.5 text-[1.125rem] font-medium text-accent">
          <span className="u-link">{cta}</span>
          <span className="rounded-[0.25rem] bg-accent-soft px-2 py-0.5 font-mono text-[0.8125rem] text-accent-strong tabular-nums">{matches}</span>
          <ArrowRight size={18} className="transition-transform duration-500 ease-[var(--ease-expo)] group-hover:translate-x-1" />
        </Link>
      </div>

      {/* Chart */}
      <div className="relative mt-10">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-y-2 md:grid-cols-[16rem_minmax(0,1fr)] md:gap-x-10">
          <span aria-hidden className="hidden md:block" />
          <div aria-hidden className="relative mb-3 h-6 font-mono text-[0.75rem] text-muted">
            {ticks.map((t) => (
              <span key={t} className="absolute -translate-x-1/2" style={{ left: pos(t) }}>
                {t}
              </span>
            ))}
          </div>

          {families.map((f) => {
            const values = f.models.map((m) => m.bhp);
            const lo = Math.min(...values);
            const hi = Math.max(...values);
            const nearest = [...f.models].filter((m) => m.bhp >= need).sort((a, b) => a.bhp - b.bhp)[0];
            return (
              <div key={f.href} className="contents">
                <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4 md:block md:pb-6">
                  <Link href={f.href} className="group block text-[1.125rem] font-medium leading-snug tracking-[-0.02em]">
                    <span className="u-link">{f.name}</span>
                  </Link>
                  <p className="mt-1 font-mono text-[0.8125rem] text-muted">
                    {fmt(lo)}–{fmt(hi)} {unit} · {f.models.length}
                  </p>
                </div>
                <div className="relative border-line pb-8 pt-6 md:border-t md:pb-6">
                  {/* track + family range */}
                  <div className="relative h-8">
                    <span aria-hidden className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line-strong" />
                    <span
                      aria-hidden
                      className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-accent/20"
                      style={{ left: pos(lo), width: `calc(${pos(hi)} - ${pos(lo)})` }}
                    />
                    {f.models.map((m) => {
                      const ok = m.bhp >= need;
                      const best = nearest?.code === m.code;
                      const at = m.bhp / scaleMax;
                      const tipAlign = at > 0.8 ? "right-0" : at < 0.2 ? "left-0" : "left-1/2 -translate-x-1/2";
                      return (
                        <Link
                          key={m.code}
                          href={`${f.href}#model-${m.code}`}
                          className={cn(
                            "group/tick absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-[background-color,border-color,transform] duration-300",
                            best ? "z-10 h-4 w-4 border-accent bg-accent" : ok ? "h-3 w-3 border-accent bg-paper" : "h-2.5 w-2.5 border-ink/25 bg-paper",
                            "hover:z-20 hover:scale-125 focus-visible:z-20",
                          )}
                          style={{ left: pos(m.bhp) }}
                          aria-label={`${m.code}: ${fmt(m.bhp)} ${unit}${m.rpm ? `, ${m.rpm} rpm` : ""}`}
                        >
                          <span
                            role="tooltip"
                            className={cn(
                              "pointer-events-none absolute bottom-full mb-2.5 hidden whitespace-nowrap rounded-[0.25rem] bg-ink px-2.5 py-1.5 font-mono text-[0.75rem] text-white group-hover/tick:block group-focus-visible/tick:block",
                              tipAlign,
                            )}
                          >
                            {m.code} · {fmt(m.bhp)} {unit}
                            {m.rpm ? ` · ${m.rpm} rpm` : ""}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                  {/* nearest match */}
                  <p className="mt-2 h-5 font-mono text-[0.8125rem] text-accent">
                    {nearest ? (
                      <Link href={`${f.href}#model-${nearest.code}`} className="u-link">
                        {nearest.code} · {fmt(nearest.bhp)} {unit}
                        {nearest.rpm ? ` · ${nearest.rpm} rpm` : ""}
                      </Link>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* requirement marker across the rows */}
        <div aria-hidden className="pointer-events-none absolute bottom-0 top-9 hidden md:left-[18.5rem] md:right-0 md:block">
          <span
            className="absolute bottom-0 top-0 w-px bg-accent transition-[left] duration-200"
            style={{ left: pos(need) }}
          >
            <span className="absolute -left-[3px] -top-[3px] h-[7px] w-[7px] rounded-full bg-accent" />
          </span>
        </div>
      </div>
    </div>
  );
}
