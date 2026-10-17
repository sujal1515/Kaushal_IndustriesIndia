"use client";

import Image from "next/image";
import Link from "next/link";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { gsap } from "@/components/motion/gsap";
import { cn } from "@/lib/utils";

/** `cutout`: a transparent product cut-out (otherwise a photo on white, blended into the surface). */
export type ShowcaseLine = { slug: string; name: string; image: string | null; cutout?: boolean };

/** Handlers that hold the rotation while a mouse is over a part, or keyboard focus is inside it. */
type HoldHandlers = {
  onPointerEnter: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerLeave: (e: ReactPointerEvent<HTMLElement>) => void;
  onFocus: (e: FocusEvent<HTMLElement>) => void;
  onBlur: (e: FocusEvent<HTMLElement>) => void;
};

type Ctx = {
  lines: ShowcaseLine[];
  active: number;
  /** +1 stepped forward, -1 stepped back, 0 jumped straight to a line */
  dir: 1 | -1 | 0;
  select: (i: number) => void;
  next: () => void;
  prev: () => void;
  paused: boolean;
  userPaused: boolean;
  togglePause: () => void;
  hold: HoldHandlers;
};

const ShowcaseContext = createContext<Ctx | null>(null);
const useShowcase = () => {
  const ctx = useContext(ShowcaseContext);
  if (!ctx) throw new Error("Showcase parts must be inside <ShowcaseProvider>");
  return ctx;
};

const pad = (n: number) => String(n).padStart(2, "0");
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const SLIDE_MS = 5000;

/**
 * Home hero product-range showcase. The six product lines take turns every 5s: the photo
 * changes on the centre stage while the names roll through the range list. Rotation holds while
 * a mouse is over either part or keyboard focus is inside it, when the hero is off-screen or the
 * tab is hidden, on request (pause button), and never auto-starts for reduced-motion visitors.
 */
export function ShowcaseProvider({ lines, children, className }: { lines: ShowcaseLine[]; children: ReactNode; className?: string }) {
  const [state, setState] = useState<{ active: number; dir: 1 | -1 | 0 }>({ active: 0, dir: 0 });
  const [hover, setHover] = useState(false);
  const [focused, setFocused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [offscreen, setOffscreen] = useState(false);
  const [reduced, setReduced] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const n = lines.length;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    const el = rootRef.current;
    const io = el ? new IntersectionObserver(([e]) => setOffscreen(!e.isIntersecting), { threshold: 0.15 }) : null;
    if (el && io) io.observe(el);
    const onVis = () => setOffscreen(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      mq.removeEventListener("change", sync);
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const value: Ctx = {
    lines,
    active: state.active,
    dir: state.dir,
    select: (i) => setState((s) => (i === s.active ? s : { active: ((i % n) + n) % n, dir: 0 })),
    next: () => setState((s) => ({ active: (s.active + 1) % n, dir: 1 })),
    prev: () => setState((s) => ({ active: (s.active - 1 + n) % n, dir: -1 })),
    paused: hover || focused || userPaused || offscreen || reduced,
    userPaused: userPaused || reduced,
    togglePause: () => setUserPaused((p) => !p),
    hold: {
      onPointerEnter: (e) => {
        if (e.pointerType === "mouse") setHover(true);
      },
      onPointerLeave: (e) => {
        if (e.pointerType === "mouse") setHover(false);
      },
      // Keyboard focus only: a mouse click on a control shouldn't freeze the rotation.
      onFocus: (e) => {
        if (e.target.matches(":focus-visible")) setFocused(true);
      },
      onBlur: (e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      },
    },
  };

  return (
    <ShowcaseContext.Provider value={value}>
      <div ref={rootRef} className={cn("relative", className)}>
        {children}
      </div>
    </ShowcaseContext.Provider>
  );
}

/**
 * Centre stage: just the product, set straight on the surface, breathing gently. On each change
 * the photo lifts away and the next one rises into place (falls, when stepping back). Below it,
 * a quiet counter with previous / next and pause. The photo opens the active category.
 */
export function ShowcaseStage({ className }: { className?: string }) {
  const { lines, active, dir, userPaused, togglePause, next, prev, hold } = useShowcase();
  const floatRef = useRef<HTMLSpanElement>(null);
  const layers = useRef<(HTMLSpanElement | null)[]>([]);
  const prevActive = useRef(active);

  // Photo change: the outgoing photo lifts and fades, the incoming one settles in a beat later.
  useEffect(() => {
    const from = prevActive.current;
    prevActive.current = active;
    if (from === active) return;
    const incoming = layers.current[active];
    const outgoing = layers.current[from];
    if (!incoming) return;
    gsap.killTweensOf(layers.current.filter(Boolean));
    layers.current.forEach((l, i) => l && i !== active && i !== from && gsap.set(l, { autoAlpha: 0 }));
    if (reducedMotion()) {
      gsap.set(incoming, { autoAlpha: 1, yPercent: 0, scale: 1 });
      if (outgoing) gsap.set(outgoing, { autoAlpha: 0 });
      return;
    }
    const s = dir === -1 ? -1 : 1;
    if (outgoing) gsap.to(outgoing, { autoAlpha: 0, yPercent: -5 * s, scale: 0.97, duration: 0.5, ease: "power2.in" });
    gsap.fromTo(
      incoming,
      { autoAlpha: 0, yPercent: 7 * s, scale: 0.96 },
      { autoAlpha: 1, yPercent: 0, scale: 1, duration: 1.1, ease: "expo.out", delay: 0.32 },
    );
  }, [active, dir]);

  // A slow breath, so the product never sits quite still.
  useEffect(() => {
    const float = floatRef.current;
    if (!float || reducedMotion()) return;
    const bob = gsap.to(float, { yPercent: -1.6, duration: 3.2, ease: "sine.inOut", yoyo: true, repeat: -1 });
    return () => {
      bob.kill();
    };
  }, []);

  const current = lines[active];
  const blend = !lines.every((l) => l.cutout);
  return (
    <div className={className} {...hold}>
      <div className="flex flex-1 items-center justify-center">
        <Link href={`/products/${current.slug}`} aria-label={current.name} className="hh-product group">
          {/* Cut-outs sit straight on the surface. Photos on white get a multiply blend, which
              sits on this outermost wrapper so it always reaches the surface (inner transforms
              would otherwise isolate it and leave white boxes behind the photos). */}
          <span className="hh-product-blend" data-blend={blend || undefined}>
            <span className="hh-product-zoom">
              <span ref={floatRef} className="absolute inset-0">
                {lines.map((l, i) => (
                  <span
                    key={l.slug}
                    ref={(el) => {
                      layers.current[i] = el;
                    }}
                    className="absolute inset-0"
                    style={{ visibility: i === 0 ? "visible" : "hidden", opacity: i === 0 ? 1 : 0 }}
                    aria-hidden={i !== active}
                  >
                    {l.image && (
                      <Image
                        src={l.image}
                        alt=""
                        fill
                        priority={i === 0}
                        quality={90}
                        sizes="(min-width: 1200px) 27vw, (min-width: 768px) 45vw, 90vw"
                        className="object-contain"
                      />
                    )}
                  </span>
                ))}
              </span>
            </span>
          </span>
        </Link>
      </div>

      {/* Previous · counter · next, and pause */}
      <div
        className="fade-up flex items-center justify-between font-mono text-[0.8125rem] font-medium text-ink"
        style={{ "--d": "0.45s" } as React.CSSProperties}
      >
        <div className="-ml-2.5 flex items-center">
          <button type="button" onClick={prev} aria-label="Previous product line" className="hh-ctrl">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path d="M10 3 5 8l5 5" />
            </svg>
          </button>
          <span aria-hidden className="min-w-[4.25rem] text-center tabular-nums">
            {pad(active + 1)} <span className="text-ink/30">/</span> <span className="text-ink/45">{pad(lines.length)}</span>
          </span>
          <button type="button" onClick={next} aria-label="Next product line" className="hh-ctrl">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path d="m6 3 5 5-5 5" />
            </svg>
          </button>
        </div>
        <button
          type="button"
          onClick={togglePause}
          aria-label={userPaused ? "Play product showcase" : "Pause product showcase"}
          aria-pressed={userPaused}
          className="hh-ctrl -mr-2.5"
        >
          {userPaused ? (
            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="currentColor" aria-hidden>
              <path d="M3 1.5v9l7.5-4.5L3 1.5Z" />
            </svg>
          ) : (
            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="currentColor" aria-hidden>
              <path d="M2.75 1.5h2.25v9H2.75zM7 1.5h2.25v9H7z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

const VISIBLE = 5; // rows in the roller window
const CENTER = 2; // window row that holds the active line

/**
 * Product range on a drum: the six lines roll up one row at a time, so each name follows the
 * one before it, endlessly. The active line holds the centre slot, with the progress line under
 * it; the others fade with distance. Three copies of the list keep the loop seamless; only the
 * middle copy is exposed to assistive tech and the tab order.
 */
export function ShowcaseRoller({ label, className }: { label: string; className?: string }) {
  const { lines, active, dir, select, next, paused, hold } = useShowcase();
  const n = lines.length;
  const rows = [...lines, ...lines, ...lines];
  const listRef = useRef<HTMLOListElement>(null);
  const rowH = useRef(0);
  const pos = useRef(n + active); // drum position: the row index sitting in the centre slot
  const [start] = useState(() => n + active);

  // Measure the row height, and keep the drum aligned when it changes.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      rowH.current = (list.firstElementChild as HTMLElement | null)?.offsetHeight ?? 0;
      gsap.set(list, { y: (CENTER - pos.current) * rowH.current });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
  }, []);

  // Roll to the active line.
  useEffect(() => {
    const list = listRef.current;
    const h = rowH.current;
    if (!list || !h) return;
    // Where the drum is now (mid-roll included), shifted by whole copies onto the middle copy.
    // The rows repeat every n, so the shift is invisible.
    let cur = CENTER - (gsap.getProperty(list, "y") as number) / h;
    while (cur < n) cur += n;
    while (cur >= 2 * n) cur -= n;
    gsap.set(list, { y: (CENTER - cur) * h });
    const at = Math.round(cur);
    let delta = (active - (at % n) + n) % n; // rows forward
    if (delta !== 0) {
      if (dir === -1) delta -= n; // stepping back rolls down
      else if (dir === 0 && delta > n / 2) delta -= n; // jumps take the short way
    }
    if (at + delta - CENTER < 0) delta += n;
    if (at + delta + CENTER > rows.length - 1) delta -= n;
    pos.current = at + delta;
    const y = (CENTER - pos.current) * h;
    if (reducedMotion()) gsap.set(list, { y });
    else gsap.to(list, { y, duration: 0.85, ease: "expo.inOut", overwrite: true });
  }, [active, dir, n, rows.length]);

  return (
    <div className={className} {...hold}>
      <p className="mb-3 font-mono text-[0.8125rem] font-medium uppercase text-white/70">{label}</p>
      <div className="hh-roller relative overflow-clip" style={{ height: `calc(${VISIBLE} * var(--roller-row))` }}>
        <ol ref={listRef} style={{ transform: `translateY(calc(${CENTER - start} * var(--roller-row)))` }}>
          {rows.map((l, v) => {
            const i = v % n;
            const real = v >= n && v < 2 * n;
            const rel = (i - active + n) % n;
            const d = Math.min(rel, n - rel);
            const on = d === 0;
            return (
              <li key={`${l.slug}-${v}`} className="h-[var(--roller-row)]" aria-hidden={real ? undefined : true}>
                <Link
                  href={`/products/${l.slug}`}
                  tabIndex={real ? undefined : -1}
                  onFocus={real ? () => select(i) : undefined}
                  aria-current={real && on ? "true" : undefined}
                  data-on={on || undefined}
                  className="hh-roller-row"
                  style={{ "--dim": on ? 1 : d === 1 ? 0.5 : d === 2 ? 0.22 : 0 } as React.CSSProperties}
                >
                  <span className="hh-roller-meta">{pad(i + 1)}</span>
                  <span className="hh-roller-name">{l.name}</span>
                </Link>
              </li>
            );
          })}
        </ol>
        {/* Progress line under the centre slot */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 h-px bg-white/20"
          style={{ top: `calc(${CENTER + 1} * var(--roller-row) - 1px)` }}
        >
          <span
            key={active}
            className="block h-full origin-left bg-sky"
            style={{ animation: `showcase-progress ${SLIDE_MS}ms linear both`, animationPlayState: paused ? "paused" : "running" }}
            onAnimationEnd={(e) => {
              // Reduced motion shortens every animation to ~0ms; never let that spin the carousel.
              if (e.elapsedTime * 1000 < SLIDE_MS - 50 || reducedMotion()) return;
              next();
            }}
          />
        </span>
      </div>
    </div>
  );
}
