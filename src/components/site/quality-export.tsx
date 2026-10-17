"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "@/components/motion/gsap";
import { ArrowLong } from "@/components/ui/system";
import { ArrowRight } from "@/components/ui/icons";
import { ExportGlobe } from "./export-globe";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const CYCLE_MS = 3200;

/**
 * Quality & export band. The dark band opens out to full width as it scrolls in; on the left a
 * certification seal draws itself and turns with the scroll, on the right a satellite globe
 * swings from Agra to each export region in turn and draws the route. Pointing at a region
 * chip shows that route; the glow follows the pointer across the band.
 */
export function QualityExport({ regions }: { regions: readonly string[] }) {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Step through the regions while the band is on screen.
  useEffect(() => {
    if (held || !inView || reducedMotion()) return;
    const t = window.setInterval(() => setActive((a) => (a + 1) % regions.length), CYCLE_MS);
    return () => window.clearInterval(t);
  }, [held, inView, regions.length]);

  useGSAP(
    () => {
      const el = root.current;
      if (!el || reducedMotion() || !document.documentElement.classList.contains("motion")) return;
      const mm = gsap.matchMedia();
      // The band opens out from an inset panel to full bleed as it arrives.
      mm.add({ wide: "(min-width: 768px)", narrow: "(max-width: 767px)" }, (c) => {
        const inset = c.conditions?.wide ? "inset(4rem 2.5rem)" : "inset(2rem 0.75rem)";
        gsap.fromTo(
          ".qx-bg",
          { clipPath: inset },
          { clipPath: "inset(0rem 0rem)", ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "top 20%", scrub: 0.6 } },
        );
      });
      // The seal turns with the scroll (on top of its own slow spin).
      gsap.fromTo(
        ".qx-seal-scroll",
        { rotation: -40 },
        { rotation: 80, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.8 } },
      );
      // Glow follows the pointer.
      const glow = el.querySelector<HTMLElement>(".qx-glow");
      if (glow && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        const xTo = gsap.quickTo(glow, "x", { duration: 1.2, ease: "power3.out" });
        const yTo = gsap.quickTo(glow, "y", { duration: 1.2, ease: "power3.out" });
        const move = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          xTo(e.clientX - r.left);
          yTo(e.clientY - r.top);
        };
        el.addEventListener("pointermove", move);
        return () => {
          el.removeEventListener("pointermove", move);
          mm.revert();
        };
      }
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} className="qx" data-inview={inView || undefined} aria-label="Quality and export">
      <div aria-hidden className="qx-bg">
        <div
          data-parallax="trigger"
          data-parallax-start="-12"
          data-parallax-end="12"
          data-parallax-scroll-start="top bottom"
          className="absolute inset-x-0 -top-[10%] h-[120%]"
        >
          <div className="qx-grid" />
        </div>
        <div className="qx-glow" />
      </div>

      <div className="padding-global relative">
        {/* Quality */}
        <div className="qx-row">
          <div className="qx-visual">
            <QualitySeal />
          </div>
          <div className="flex flex-col items-start">
            <p className="eyebrow !text-sky" data-split>
              Quality &amp; certifications
            </p>
            <p className="h3 mt-5 max-w-[34rem]" data-split>
              ISO 9001:2015 quality management, and up to two years warranty.
            </p>
            <Link href="/quality-certifications" className="case-button group mt-10">
              <ArrowLong className="h-[1.1rem] w-[1.6rem] text-accent transition-transform duration-500 ease-[var(--ease-expo)] group-hover:translate-x-1" />
              <span className="u-link">Quality, certificates &amp; awards</span>
            </Link>
          </div>
        </div>

        {/* Export */}
        <div className="qx-row">
          <div className="flex flex-col items-start lg:pl-[8%]">
            <p className="eyebrow !text-sky" data-split>
              Export markets
            </p>
            <p className="text-regular mt-5 max-w-[30rem]">Supplying importers, distributors and governments in 60+ countries.</p>
            <ul className="mt-8 flex max-w-[32rem] flex-wrap gap-2" onPointerLeave={() => setHeld(false)}>
              {regions.map((r, i) => (
                <li
                  key={r}
                  data-on={i === active || undefined}
                  onPointerEnter={() => {
                    setActive(i);
                    setHeld(true);
                  }}
                  className="qx-chip"
                >
                  {r}
                </li>
              ))}
            </ul>
            <Link href="/export-markets" className="group mt-10 inline-flex items-center gap-2 text-[1.125rem] font-medium">
              <span className="u-link">Export capability</span>
              <ArrowRight size={18} className="transition-transform duration-500 ease-[var(--ease-expo)] group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="qx-visual max-lg:order-first">
            <ExportGlobe regions={regions} active={active} running={inView} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Certification seal                                                  */
/* ------------------------------------------------------------------ */

const TICKS = Array.from({ length: 72 }, (_, i) => i);
const RING_TEXT = "ISO 9001:2015 · Quality management system · Up to two years warranty · ";

function QualitySeal() {
  const draw = (d: string) => ({ "--d": d }) as React.CSSProperties;
  return (
    <div className="qx-seal relative h-full w-full" aria-hidden>
      {/* Outer dial: turns with the scroll (an HTML layer, so it rotates about its own centre) */}
      <div className="qx-seal-scroll absolute inset-0">
        <svg viewBox="0 0 400 400" className="h-full w-full overflow-visible" focusable="false">
          <defs>
            <path id="qx-ring" d="M200,200 m-148,0 a148,148 0 1,1 296,0 a148,148 0 1,1 -296,0" />
          </defs>
          <circle cx="200" cy="200" r="190" pathLength={1} className="qx-draw" stroke="rgb(247 239 232 / 0.28)" strokeWidth="1" fill="none" />
          {TICKS.map((i) => {
            const a = (i / TICKS.length) * Math.PI * 2;
            const major = i % 6 === 0;
            const r1 = major ? 166 : 172;
            // Rounded so server and browser render identical numbers.
            const p = (r: number, f: (x: number) => number) => Math.round((200 + f(a) * r) * 100) / 100;
            return (
              <line
                key={i}
                x1={p(r1, Math.cos)}
                y1={p(r1, Math.sin)}
                x2={p(180, Math.cos)}
                y2={p(180, Math.sin)}
                className="qx-tick"
                style={{ "--i": i } as React.CSSProperties}
                stroke={major ? "#c79a74" : "rgb(247 239 232 / 0.4)"}
                strokeWidth={major ? 1.6 : 1}
              />
            );
          })}
          <g className="qx-seal-spin">
            <text className="qx-ring-text" fill="rgb(247 239 232 / 0.85)">
              <textPath href="#qx-ring" textLength="924" lengthAdjust="spacing">
                {RING_TEXT.toUpperCase()}
              </textPath>
            </text>
          </g>
        </svg>
      </div>
      {/* Core: stays upright */}
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full" focusable="false">
        <circle cx="200" cy="200" r="122" pathLength={1} className="qx-draw" style={draw("0.35s")} stroke="#996f51" strokeWidth="1.5" fill="rgb(153 111 81 / 0.1)" />
        <g transform="translate(152 146) scale(4)" fill="none" stroke="#f7efe8" strokeWidth="0.55" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6Z" pathLength={1} className="qx-draw" style={draw("0.6s")} />
          <path d="m9 12 2 2 4-4" pathLength={1} className="qx-draw" stroke="#e2c7ae" strokeWidth="0.75" style={draw("1.2s")} />
        </g>
      </svg>
    </div>
  );
}
