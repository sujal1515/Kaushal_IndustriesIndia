"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SearchIndexItem } from "@/lib/data/catalogue";
import { cn } from "@/lib/utils";
import { ArrowRight, Search } from "@/components/ui/icons";

const SUGGESTIONS = ["Air cooled", "Water cooled", "Generating set", "Pump", "EF1A", "EL2", "Irrigation"];

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

type Hit = { item: SearchIndexItem; models: string[]; score: number };

/** Same ranking idea as the server search: model codes first, then names, then keywords. */
function rank(index: SearchIndexItem[], query: string): Hit[] {
  const q = norm(query);
  if (q.length < 2) return [];
  const tokens = q.split(" ").filter(Boolean);
  const hits: Hit[] = [];
  for (const item of index) {
    const haystack = norm(`${item.name} ${item.keywords} ${item.models.join(" ")}`);
    let score = 0;
    const models: string[] = [];
    let all = true;
    for (const t of tokens) {
      const ct = compact(t);
      const exact = item.models.filter((m) => compact(m) === ct);
      const prefix = ct.length >= 2 ? item.models.filter((m) => compact(m).startsWith(ct)) : [];
      if (exact.length) {
        score += 20;
        models.push(...exact);
      } else if (prefix.length) {
        score += 8;
        models.push(...prefix);
      }
      if (norm(item.name).includes(t)) score += 6;
      else if (haystack.includes(t)) score += 2;
      else if (!exact.length && !prefix.length) all = false;
    }
    if (all && score > 0) hits.push({ item, models: [...new Set(models)], score });
  }
  return hits.sort((a, b) => b.score - a.score);
}

/**
 * Instant product and model search (opens from the header search button, "/" or Ctrl/⌘+K).
 * Results update as you type; arrow keys move, Enter opens, Esc closes. The full search page
 * remains one Enter away for longer queries.
 */
export function QuickSearch({ index, open, onClose }: { index: SearchIndexItem[]; open: boolean; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const hits = useMemo(() => rank(index, query), [index, query]);
  const shown = hits.slice(0, 6);

  useEffect(() => {
    if (!open) return;
    const lenis = (window as unknown as { __lenis?: { stop: () => void; start: () => void } }).__lenis;
    lenis?.stop();
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      clearTimeout(t);
      lenis?.start();
    };
  }, [open]);

  const go = (href: string) => {
    onClose();
    setQuery("");
    router.push(href);
  };
  const resultHref = (h: Hit) => (h.models.length ? `${h.item.href}#model-${h.models[0]}` : h.item.href);
  const allHref = `/search?q=${encodeURIComponent(query.trim())}`;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(shown.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (shown[active]) go(resultHref(shown[active]));
      else if (query.trim()) go(allHref);
    } else if (e.key === "Tab" && panelRef.current) {
      const focusables = Array.from(panelRef.current.querySelectorAll<HTMLElement>("input, a[href], button"));
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-[120] transition-[visibility] duration-300",
        open ? "visible" : "pointer-events-none invisible",
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Search products and models"
      onKeyDown={onKeyDown}
    >
      <div
        aria-hidden
        onClick={onClose}
        className={cn("absolute inset-0 bg-ink/45 transition-opacity duration-300", open ? "opacity-100" : "opacity-0")}
      />
      <div
        ref={panelRef}
        className={cn(
          "relative mx-auto mt-[9vh] flex max-h-[80vh] w-[min(52rem,calc(100vw-2rem))] flex-col overflow-hidden border border-line bg-paper",
          "transition-[opacity,transform,clip-path] duration-500 ease-[var(--ease-nav)]",
          open ? "translate-y-0 opacity-100 [clip-path:inset(0_0_0_0)]" : "-translate-y-4 opacity-0 [clip-path:inset(0_0_100%_0)]",
        )}
      >
        <label className="flex items-center gap-4 border-b border-line px-6 py-2" htmlFor="quick-search-q">
          <Search size={22} className="shrink-0 text-accent" />
          <span className="sr-only">Search by product, application or model code</span>
          <input
            ref={inputRef}
            id="quick-search-q"
            type="search"
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Try “EF1A”, “water cooled” or “irrigation”"
            className="w-full bg-transparent py-4 text-[1.375rem] font-medium tracking-[-0.02em] outline-none placeholder:text-ink/35"
            aria-controls="quick-search-results"
            aria-activedescendant={shown[active] ? `qs-${active}` : undefined}
          />
          <kbd className="hidden shrink-0 rounded-[0.25rem] border border-line-strong px-2 py-1 font-mono text-[0.75rem] text-muted sm:block">
            Esc
          </kbd>
        </label>

        <div id="quick-search-results" className="min-h-0 overflow-y-auto overscroll-contain" data-lenis-prevent>
          {query.trim().length < 2 ? (
            <div className="flex flex-wrap gap-2 p-6">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setQuery(s);
                    setActive(0);
                    inputRef.current?.focus();
                  }}
                  className="rounded-[0.25rem] border border-line-strong px-3.5 py-2 text-[0.95rem] font-medium transition-colors duration-300 hover:border-ink"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : (
            <>
              <ul role="listbox" aria-label="Search products and models">
                {shown.map((h, i) => (
                  <li key={h.item.href} id={`qs-${i}`} role="option" aria-selected={i === active}>
                    <Link
                      href={resultHref(h)}
                      onClick={(e) => {
                        e.preventDefault();
                        go(resultHref(h));
                      }}
                      onMouseEnter={() => setActive(i)}
                      className={cn(
                        "flex items-center gap-5 border-b border-line px-6 py-4 transition-colors duration-200",
                        i === active ? "bg-stone" : "bg-transparent",
                      )}
                    >
                      <span className="product-tile relative h-14 w-14 shrink-0 overflow-hidden">
                        {h.item.image && <Image src={h.item.image} alt="" fill sizes="56px" className="object-contain p-1.5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[1.125rem] font-medium tracking-[-0.01em]">{h.item.name}</span>
                        <span className="mt-0.5 block font-mono text-[0.8rem] uppercase text-muted">{h.item.category}</span>
                      </span>
                      {h.models.length > 0 && (
                        <span className="hidden flex-wrap justify-end gap-1.5 sm:flex">
                          {h.models.slice(0, 3).map((m) => (
                            <span key={m} className="rounded-[0.25rem] bg-accent-soft px-2 py-0.5 font-mono text-[0.8rem] text-accent-strong">
                              {m}
                            </span>
                          ))}
                        </span>
                      )}
                      <ArrowRight size={18} className={cn("shrink-0 text-accent transition-opacity", i === active ? "opacity-100" : "opacity-0")} />
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={allHref}
                onClick={(e) => {
                  e.preventDefault();
                  go(allHref);
                }}
                className="group flex items-center justify-between gap-4 px-6 py-4 font-mono text-[0.875rem] font-medium uppercase text-accent"
              >
                <span className="u-link">
                  {hits.length} result{hits.length === 1 ? "" : "s"} for “{query.trim()}”
                </span>
                <ArrowRight size={16} />
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
