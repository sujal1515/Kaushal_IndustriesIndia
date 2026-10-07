"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { gsap } from "@/components/motion/gsap";
import { cn } from "@/lib/utils";

export type OrderStep = { t: string; b: string };

/** How long each step stays up: its play, plus a moment to take in the result. */
const STEP_MS = [6800, 9000, 6000];
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/**
 * "How to order", acted out. The three steps sit on the left; on the right a small window plays
 * each one — the model is picked from a spec table, the quote form fills itself in, then the
 * quotation arrives. Steps advance on their own while the section is on screen (a line under
 * the active step shows the time left); click a step to play it, or pause from the window bar.
 */
export function OrderSteps({ steps }: { steps: OrderStep[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const scenes = useRef<(HTMLDivElement | null)[]>([]);
  const scale = useRef(1);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const [active, setActive] = useState(0);
  const [run, setRun] = useState(0);
  const [inView, setInView] = useState(false);
  const [hover, setHover] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const paused = !inView || hover || userPaused || reduced;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    const el = rootRef.current;
    const io = el ? new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 }) : null;
    if (el && io) io.observe(el);
    return () => {
      mq.removeEventListener("change", sync);
      io?.disconnect();
    };
  }, []);

  // The scenes are drawn at a fixed size and scaled to fit the window.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const fit = () => {
      scale.current = stage.clientWidth / (canvas.offsetWidth || 1);
      stage.style.setProperty("--os-s", String(scale.current));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  // Act out the active step.
  useEffect(() => {
    const scene = scenes.current[active];
    if (!scene || !inView || reduced) return;
    const ctx = gsap.context(() => {
      tl.current = PLAYS[active]?.(scene, scale.current) ?? null;
    }, scene);
    return () => {
      ctx.revert();
      scene.querySelectorAll<HTMLElement>("[data-text]").forEach((el) => (el.textContent = el.dataset.text ?? ""));
      tl.current = null;
    };
  }, [active, run, inView, reduced]);

  useEffect(() => {
    if (!tl.current) return;
    if (userPaused) tl.current.pause();
    else tl.current.resume();
  }, [userPaused, active, run]);

  const go = (i: number) => {
    setActive(i);
    setRun((r) => r + 1);
  };

  return (
    <div
      ref={rootRef}
      className="os grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-20"
      onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHover(false)}
    >
      <ol className="border-b border-line" data-grid-draw>
        {steps.map((s, i) => {
          const on = i === active;
          return (
            <li key={s.t} data-on={on || undefined} className="os-step group relative border-t border-line py-7 pl-10">
              <span aria-hidden className="absolute bottom-7 left-0 top-7 w-[2px] bg-ink/10">
                {on && (
                  <span
                    key={`${active}-${run}`}
                    className="os-step-fill block h-full w-full origin-top bg-accent"
                    style={{ animationDuration: `${STEP_MS[i] ?? 7000}ms`, animationPlayState: paused ? "paused" : "running" }}
                    onAnimationEnd={(e) => {
                      if (e.elapsedTime * 1000 < (STEP_MS[i] ?? 7000) - 50 || reducedMotion()) return;
                      setActive((a) => (a + 1) % steps.length);
                    }}
                  />
                )}
              </span>
              <span className="os-step-num font-mono text-[0.875rem] font-medium">0{i + 1}</span>
              <h3 className="mt-2 text-[1.75rem] font-medium leading-tight tracking-[-0.04em] max-[479px]:text-[1.375rem]">
                <button
                  type="button"
                  onClick={() => go(i)}
                  aria-current={on ? "step" : undefined}
                  className="os-step-title text-left after:absolute after:inset-0 after:content-['']"
                >
                  {s.t}
                </button>
              </h3>
              <p className="os-step-body text-body mt-3 max-w-[26rem]">{s.b}</p>
            </li>
          );
        })}
      </ol>

      {/* The demo window (decorative: the steps above carry the content) */}
      <div className="os-window max-lg:order-first" aria-hidden>
        <div className="flex items-center gap-4 border-b border-line px-5 py-3.5">
          <div className="flex flex-1 items-center">
            {steps.map((s, i) => (
              <div key={s.t} className={cn("flex items-center", i < steps.length - 1 && "flex-1")}>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => go(i)}
                  className={cn("os-node", i <= active && "os-node-on")}
                >
                  0{i + 1}
                </button>
                {i < steps.length - 1 && (
                  <span className="relative mx-2 h-px flex-1 bg-ink/12">
                    <span className={cn("os-link absolute inset-0 origin-left bg-accent", i < active && "os-link-on")} />
                  </span>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setUserPaused((p) => !p)}
            className="grid h-7 w-7 place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.06]"
          >
            {userPaused ? (
              <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="currentColor">
                <path d="M3 1.5v9l7.5-4.5L3 1.5Z" />
              </svg>
            ) : (
              <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="currentColor">
                <path d="M2.75 1.5h2.25v9H2.75zM7 1.5h2.25v9H7z" />
              </svg>
            )}
          </button>
        </div>

        <div ref={stageRef} className="os-stage">
          <div ref={canvasRef} className="os-canvas">
            <SceneChoose ref={(el) => void (scenes.current[0] = el)} on={active === 0} />
            <SceneSend ref={(el) => void (scenes.current[1] = el)} on={active === 1} />
            <SceneReceive ref={(el) => void (scenes.current[2] = el)} on={active === 2} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Scenes (final state in markup; the plays animate into it)          */
/* ------------------------------------------------------------------ */

type SceneProps = { on: boolean; ref: (el: HTMLDivElement | null) => void };

function Pointer() {
  return (
    <svg data-a="ptr" viewBox="0 0 20 20" className="os-ptr">
      <path d="M3 2.5v14.2l3.9-3.6 2.6 5.6 2.5-1.2-2.6-5.5 5.4-.3L3 2.5Z" fill="#072768" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

const MODELS = [
  { code: "EE1A", bhp: 9, rpm: 1500 },
  { code: "EF1A", bhp: 10, rpm: 1500, pick: true },
  { code: "EF1XA", bhp: 12, rpm: 1600 },
  { code: "EM1A", bhp: 14, rpm: 1500 },
];

function SceneChoose({ on, ref }: SceneProps) {
  return (
    <div ref={ref} className="os-scene" data-on={on || undefined}>
      <p className="font-mono text-[11px] font-medium uppercase text-muted">
        Products <span className="mx-1 text-ink/30">/</span> Diesel engines
      </p>
      <p className="mt-2 text-[24px] font-semibold leading-tight tracking-[-0.03em] text-ink">High Speed Air Cooled Diesel Engine</p>

      <div className="mt-6 flex items-center gap-4">
        <span className="font-mono text-[11px] font-medium uppercase text-accent">Rated power</span>
        <div data-a="track" className="relative h-[2px] flex-1 bg-ink/15">
          <span data-a="fill" className="absolute inset-y-0 left-0 bg-accent" style={{ width: "26.5%" }} />
          <span
            data-a="knob"
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-white"
            style={{ left: "26.5%" }}
          />
        </div>
        <span className="w-[64px] text-right text-[15px] font-semibold tabular-nums text-ink">
          <span data-a="val" data-text="10">
            10
          </span>{" "}
          <span className="text-[12px] font-medium text-muted">bhp</span>
        </span>
      </div>

      <div className="mt-5 border-b border-line">
        <div className="grid h-[34px] grid-cols-[1fr_64px_64px_150px] items-center px-3 font-mono text-[11px] font-medium uppercase text-muted">
          <span>Model</span>
          <span>bhp</span>
          <span>rpm</span>
          <span />
        </div>
        {MODELS.map((m) => (
          <div
            key={m.code}
            data-a="row"
            {...(m.pick ? { "data-pick": "" } : {})}
            className={cn(
              "os-row grid h-[46px] grid-cols-[1fr_64px_64px_150px] items-center border-t border-line px-3 text-[15px] tabular-nums text-ink",
              m.bhp < 10 && "os-row-dim",
            )}
          >
            <span className="font-semibold">{m.code}</span>
            <span>{m.bhp}</span>
            <span>{m.rpm}</span>
            <span className="text-right">
              {m.pick && (
                <span data-a="quote" className="relative inline-flex overflow-hidden rounded-[3px] bg-accent px-3 py-1.5 text-[12px] font-semibold text-white">
                  Request a quote
                  <span data-a="ripple" className="os-ripple" />
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
      <Pointer />
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="font-mono text-[10.5px] font-medium uppercase leading-tight text-accent">{label}</p>
      <div className="mt-1.5 flex h-[34px] items-center gap-2 border-b-2 border-ink/15 text-[15px] font-medium text-ink">{children}</div>
    </div>
  );
}

function SceneSend({ on, ref }: SceneProps) {
  return (
    <div ref={ref} className="os-scene" data-on={on || undefined}>
      <p className="font-mono text-[11px] font-medium uppercase text-muted">Request for quotation</p>
      <div className="mt-4 grid grid-cols-3 gap-x-5 gap-y-4">
        <Field label="Product" className="col-span-3">
          <span data-a="prefill" className="relative -mx-1.5 inline-flex items-center gap-2 rounded-[3px] px-1.5 py-0.5">
            High Speed Air Cooled Diesel Engine
            <span className="rounded-[3px] bg-accent-soft px-1.5 py-0.5 font-mono text-[11px] text-accent-strong">EF1A</span>
            <svg data-a="prefillCheck" viewBox="0 0 24 24" className="h-4 w-4 text-accent" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 12.5 4.5 4.5L19 7.5" />
            </svg>
          </span>
        </Field>
        <Field label="Quantity">
          <span data-a="type" data-text="20">
            20
          </span>
          <span className="text-[13px] text-muted">Units</span>
        </Field>
        <Field label="Application">
          <span data-a="type" data-text="Irrigation">
            Irrigation
          </span>
        </Field>
        <Field label="Destination country">
          <span data-a="type" data-text="Kenya">
            Kenya
          </span>
        </Field>
        <div className="col-span-3">
          <p className="font-mono text-[10.5px] font-medium uppercase leading-tight text-accent">Timeline</p>
          <div className="mt-2 flex gap-2 text-[12.5px] font-medium">
            <span className="rounded-[3px] border border-ink/20 px-3 py-1.5 text-ink">Immediately</span>
            <span data-a="chip" className="rounded-[3px] border border-ink bg-ink px-3 py-1.5 text-white">
              Within 1–3 months
            </span>
            <span className="rounded-[3px] border border-ink/20 px-3 py-1.5 text-ink">Within 3–6 months</span>
          </div>
        </div>
      </div>
      <span data-a="send" className="mt-6 inline-flex items-center gap-2.5 rounded-[3px] bg-accent px-4 py-2.5 text-[13px] font-semibold text-white">
        Send quotation request
        <span className="relative h-[14px] w-[14px]">
          <svg data-a="sendArrow" viewBox="0 0 24 24" className="absolute inset-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12h15M13 6l6 6-6 6" />
          </svg>
          <svg data-a="sendCheck" viewBox="0 0 24 24" className="absolute inset-0 opacity-0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        </span>
      </span>
      <Pointer />
    </div>
  );
}

function SceneReceive({ on, ref }: SceneProps) {
  return (
    <div ref={ref} className="os-scene flex items-center justify-center" data-on={on || undefined}>
      <div data-a="mail" className="w-[440px] max-w-full rounded-[6px] border border-line bg-surface p-6 shadow-[0_24px_60px_-32px_rgba(7,39,104,0.45)]">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-[15px] font-bold text-white">K</span>
          <div>
            <p className="text-[14px] font-semibold leading-tight text-ink">Kaushal Industries</p>
            <p className="font-mono text-[11px] font-medium uppercase text-muted">Sales team</p>
          </div>
          <span data-a="new" className="ml-auto h-2.5 w-2.5 rounded-full bg-bronze" />
        </div>
        <p className="mt-5 text-[20px] font-semibold leading-tight tracking-[-0.02em] text-ink">Quotation · EF1A × 20</p>
        <ul className="mt-4 border-b border-line">
          {["Pricing", "Lead time", "Shipping options"].map((x) => (
            <li key={x} data-a="item" className="flex items-center gap-3 border-t border-line py-3 text-[15px] font-medium text-ink">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-accent-soft">
                <svg viewBox="0 0 24 24" className="h-3 w-3 text-accent" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path data-a="tick" d="m5 12.5 4.5 4.5L19 7.5" pathLength={1} />
                </svg>
              </span>
              {x}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Plays                                                               */
/* ------------------------------------------------------------------ */

/** Point inside `el` (fractions of its box) in the scene's own, unscaled coordinates. */
function spot(scene: HTMLElement, el: Element | null, s: number, fx = 0.5, fy = 0.5) {
  if (!el) return { x: 0, y: 0 };
  const r = el.getBoundingClientRect();
  const b = scene.getBoundingClientRect();
  return { x: (r.left - b.left + r.width * fx) / s, y: (r.top - b.top + r.height * fy) / s };
}

const click = (t: gsap.core.Timeline, ptr: Element | null, at: number) =>
  t.to(ptr, { scale: 0.82, duration: 0.11, yoyo: true, repeat: 1, ease: "power2.inOut", transformOrigin: "0% 0%" }, at);

const PLAYS: ((scene: HTMLElement, s: number) => gsap.core.Timeline)[] = [
  // 1 · Choose a product: filter by power, pick the model, press "Request a quote".
  (scene, s) => {
    const q = (k: string) => scene.querySelector(`[data-a="${k}"]`);
    const ptr = q("ptr");
    const knob = q("knob");
    const val = q("val") as HTMLElement | null;
    const pick = scene.querySelector("[data-pick]");
    const quote = q("quote");
    const knobEnd = spot(scene, knob, s);
    const trackStart = spot(scene, q("track"), s, 0, 0.5);
    const rowAt = spot(scene, pick, s, 0.12, 0.5);
    const quoteAt = spot(scene, quote, s, 0.45, 0.6);
    if (val) val.textContent = "3.5";
    const o = { v: 3.5 };
    const t = gsap.timeline({ defaults: { ease: "power3.out" } });
    t.from(scene.querySelectorAll('[data-a="row"]'), { autoAlpha: 0, y: 10, stagger: 0.07, duration: 0.5 }, 0.15)
      .fromTo(ptr, { autoAlpha: 0, x: trackStart.x + 40, y: trackStart.y + 60 }, { autoAlpha: 1, x: trackStart.x, y: trackStart.y, duration: 0.6 }, 0.6)
      .from(knob, { left: "0%", duration: 1.2, ease: "power2.inOut" }, 1.3)
      .from(q("fill"), { width: "0%", duration: 1.2, ease: "power2.inOut" }, 1.3)
      .to(ptr, { x: knobEnd.x, y: knobEnd.y, duration: 1.2, ease: "power2.inOut" }, 1.3)
      .to(o, { v: 10, duration: 1.2, ease: "power2.inOut", onUpdate: () => val && (val.textContent = fmt(Math.round(o.v * 2) / 2)) }, 1.3)
      .fromTo(scene.querySelectorAll(".os-row-dim"), { opacity: 1 }, { opacity: 0.38, duration: 0.45, immediateRender: false }, 2.4)
      .to(ptr, { x: rowAt.x, y: rowAt.y, duration: 0.7, ease: "power3.inOut" }, 2.7)
      .from(pick, { backgroundColor: "rgba(236, 220, 205, 0)", duration: 0.4 }, 3.25)
      .from(quote, { autoAlpha: 0, scale: 0.9, duration: 0.45 }, 3.35)
      .to(ptr, { x: quoteAt.x, y: quoteAt.y, duration: 0.6, ease: "power3.inOut" }, 3.75);
    click(t, ptr, 4.4);
    t.fromTo(q("ripple"), { scale: 0, autoAlpha: 0.45 }, { scale: 3, autoAlpha: 0, duration: 0.7, ease: "power2.out" }, 4.45);
    return t;
  },

  // 2 · Send your requirement: the product is already filled in; type the rest, pick a timeline, send.
  (scene, s) => {
    const q = (k: string) => scene.querySelector(`[data-a="${k}"]`);
    const ptr = q("ptr");
    const typed = Array.from(scene.querySelectorAll<HTMLElement>('[data-a="type"]'));
    const fieldAt = typed.map((el) => spot(scene, el, s, 0, 0.5));
    const chip = q("chip");
    const chipAt = spot(scene, chip, s, 0.5, 0.6);
    const send = q("send");
    const sendAt = spot(scene, send, s, 0.45, 0.6);
    typed.forEach((el) => (el.textContent = ""));
    const t = gsap.timeline({ defaults: { ease: "power3.out" } });
    t.from(scene.querySelectorAll(".grid > *"), { autoAlpha: 0, y: 10, stagger: 0.07, duration: 0.5 }, 0.1)
      .from(send, { autoAlpha: 0, y: 10, duration: 0.5 }, 0.45)
      .fromTo(q("prefill"), { backgroundColor: "rgba(236, 220, 205, 1)" }, { backgroundColor: "rgba(236, 220, 205, 0)", duration: 1.4, ease: "power2.out" }, 0.55)
      .from(q("prefillCheck"), { scale: 0, autoAlpha: 0, duration: 0.45, ease: "back.out(2)", transformOrigin: "50% 50%" }, 0.75)
      .fromTo(ptr, { autoAlpha: 0, x: fieldAt[0].x + 60, y: fieldAt[0].y + 70 }, { autoAlpha: 1, x: fieldAt[0].x + 4, y: fieldAt[0].y + 6, duration: 0.6 }, 1.1);
    let at = 1.75;
    typed.forEach((el, i) => {
      const full = el.dataset.text ?? "";
      const o = { n: 0 };
      if (i > 0) t.to(ptr, { x: fieldAt[i].x + 4, y: fieldAt[i].y + 6, duration: 0.5, ease: "power3.inOut" }, at - 0.55);
      click(t, ptr, at - 0.05);
      t.to(o, { n: full.length, duration: full.length * 0.07, ease: "none", onUpdate: () => (el.textContent = full.slice(0, Math.round(o.n))) }, at);
      at += full.length * 0.07 + 0.62;
    });
    t.to(ptr, { x: chipAt.x, y: chipAt.y, duration: 0.55, ease: "power3.inOut" }, at - 0.5);
    click(t, ptr, at + 0.1);
    t.from(chip, { backgroundColor: "rgba(7, 39, 104, 0)", color: "#072768", borderColor: "rgba(7, 39, 104, 0.2)", duration: 0.3 }, at + 0.15);
    at += 0.7;
    t.to(ptr, { x: sendAt.x, y: sendAt.y, duration: 0.6, ease: "power3.inOut" }, at);
    click(t, ptr, at + 0.65);
    t.to(q("sendArrow"), { x: 18, autoAlpha: 0, duration: 0.35, ease: "power2.in" }, at + 0.75)
      .to(q("sendCheck"), { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)", startAt: { scale: 0.4 } }, at + 1.05)
      .to(ptr, { autoAlpha: 0, x: "+=30", y: "+=30", duration: 0.5 }, at + 1.5);
    return t;
  },

  // 3 · Receive a quotation: the reply lands, and its contents check off.
  (scene) => {
    const q = (k: string) => scene.querySelector(`[data-a="${k}"]`);
    const t = gsap.timeline({ defaults: { ease: "power3.out" } });
    t.from(q("mail"), { autoAlpha: 0, y: -36, scale: 0.97, duration: 0.8, ease: "expo.out" }, 0.15)
      .fromTo(q("new"), { scale: 0 }, { scale: 1, duration: 0.4, ease: "back.out(3)" }, 0.75)
      .to(q("new"), { scale: 1.6, autoAlpha: 0.4, duration: 0.6, yoyo: true, repeat: 3, ease: "sine.inOut" }, 1.2)
      .from(scene.querySelectorAll('[data-a="item"]'), { autoAlpha: 0, x: -10, stagger: 0.45, duration: 0.5 }, 1.0)
      .fromTo(scene.querySelectorAll('[data-a="tick"]'), { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, stagger: 0.45, duration: 0.45, ease: "power2.out" }, 1.25);
    return t;
  },
];

