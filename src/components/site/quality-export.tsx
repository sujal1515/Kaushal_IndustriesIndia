"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "@/components/motion/gsap";
import { ArrowLong } from "@/components/ui/system";
import { ArrowRight } from "@/components/ui/icons";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Agra — where every route starts. */
const ORIGIN: [number, number] = [27.18, 78.01];
/** An indicative point inside each export region, used only to draw its route on the globe. */
const PLACES: Record<string, [number, number]> = {
  "Indian sub-continent": [23.7, 90.4],
  "Middle East": [24.5, 54.4],
  "Far East Asia": [14.6, 121],
  Australia: [-25.3, 133.8],
  Africa: [-1.3, 36.8],
  Europe: [48.8, 9.2],
  "The Americas": [-12, -62],
};
const CYCLE_MS = 3200;

/**
 * Quality & export band. The dark band opens out to full width as it scrolls in; on the left a
 * certification seal draws itself and turns with the scroll, on the right a wireframe globe
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
            <p className="eyebrow !text-sky">Quality &amp; certifications</p>
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
            <p className="eyebrow !text-sky">Export markets</p>
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

/* ------------------------------------------------------------------ */
/* Export globe (canvas, orthographic projection)                      */
/* ------------------------------------------------------------------ */

type Vec = [number, number, number];
const RAD = Math.PI / 180;
const toVec = (lat: number, lon: number): Vec => [Math.cos(lat * RAD) * Math.cos(lon * RAD), Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD)];
const toLatLon = (v: Vec): [number, number] => [Math.asin(Math.max(-1, Math.min(1, v[2]))) / RAD, Math.atan2(v[1], v[0]) / RAD];
const wrap = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

/** Points along the great circle from a to b, each with a lift that peaks mid-route. */
function route(a: [number, number], b: [number, number], steps = 72) {
  const va = toVec(...a);
  const vb = toVec(...b);
  const dot = Math.max(-1, Math.min(1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]));
  const w = Math.acos(dot);
  const s = Math.sin(w) || 1;
  const lift = Math.min(0.42, 0.08 + w * 0.22);
  return Array.from({ length: steps + 1 }, (_, k) => {
    const t = k / steps;
    const ka = Math.sin((1 - t) * w) / s;
    const kb = Math.sin(t * w) / s;
    const [lat, lon] = toLatLon([va[0] * ka + vb[0] * kb, va[1] * ka + vb[1] * kb, va[2] * ka + vb[2] * kb]);
    return { lat, lon, h: Math.sin(Math.PI * t) * lift };
  });
}

function ExportGlobe({ regions, active, running }: { regions: readonly string[]; active: number; running: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const state = useRef({ active, since: 0, lon0: 0, lat0: 16, init: false });

  useEffect(() => {
    state.current.active = active;
    state.current.since = performance.now();
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const still = reducedMotion();
    const font = getComputedStyle(canvas).fontFamily;
    const dests = regions.map((r) => PLACES[r] ?? ORIGIN);
    const routes = dests.map((d) => route(ORIGIN, d));
    const s = state.current;
    let size = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = canvas.clientWidth;
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
    };
    resize();
    const ro = new ResizeObserver(() => {
      resize();
      if (still || !running) draw(performance.now());
    });
    ro.observe(canvas);

    const targetLon = (i: number) => ORIGIN[1] + wrap(dests[i][1] - ORIGIN[1]) / 2;
    if (!s.init) {
      s.lon0 = targetLon(s.active);
      s.init = true;
    }

    let last = performance.now();
    function draw(now: number) {
      const dt = Math.min(64, now - last);
      last = now;
      const R = size * 0.43;
      const cx = size / 2;
      const cy = size / 2;
      // Swing toward the active route.
      const goal = targetLon(s.active) + (still ? 0 : Math.sin(now / 5200) * 6);
      s.lon0 += wrap(goal - s.lon0) * (still ? 1 : 1 - Math.pow(0.0018, dt / 1000));
      const p0 = s.lat0 * RAD;
      const sinP0 = Math.sin(p0);
      const cosP0 = Math.cos(p0);
      const project = (lat: number, lon: number, h = 0) => {
        const p = lat * RAD;
        const l = (lon - s.lon0) * RAD;
        const cosP = Math.cos(p);
        const x = cosP * Math.sin(l);
        const y = cosP0 * Math.sin(p) - sinP0 * cosP * Math.cos(l);
        const z = sinP0 * Math.sin(p) + cosP0 * cosP * Math.cos(l);
        const k = 1 + h;
        const visible = z > 0 || (x * x + y * y) * k * k > 1;
        return { x: cx + R * x * k, y: cy - R * y * k, z, visible };
      };

      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, size, size);

      // Sphere
      const g = ctx!.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
      g.addColorStop(0, "rgba(226, 199, 174, 0.12)");
      g.addColorStop(1, "rgba(153, 111, 81, 0.05)");
      ctx!.fillStyle = g;
      ctx!.beginPath();
      ctx!.arc(cx, cy, R, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.strokeStyle = "rgba(247, 239, 232, 0.3)";
      ctx!.lineWidth = 1;
      ctx!.stroke();

      // Graticule (front side only)
      const line = (pts: { x: number; y: number; visible: boolean; z: number }[]) => {
        let pen = false;
        ctx!.beginPath();
        for (const pt of pts) {
          if (pt.z > 0) {
            if (pen) ctx!.lineTo(pt.x, pt.y);
            else ctx!.moveTo(pt.x, pt.y);
            pen = true;
          } else pen = false;
        }
        ctx!.stroke();
      };
      ctx!.lineWidth = 0.75;
      for (let lat = -60; lat <= 60; lat += 20) {
        ctx!.strokeStyle = lat === 0 ? "rgba(247, 239, 232, 0.24)" : "rgba(247, 239, 232, 0.1)";
        line(Array.from({ length: 121 }, (_, k) => project(lat, -180 + k * 3)));
      }
      ctx!.strokeStyle = "rgba(247, 239, 232, 0.1)";
      for (let lon = -180; lon < 180; lon += 20) line(Array.from({ length: 61 }, (_, k) => project(-90 + k * 3, lon)));

      // Routes
      const t = (now - s.since) / 1000;
      const drawRoute = (i: number, upto: number, color: string, width: number) => {
        const pts = routes[i];
        const n = Math.max(1, Math.floor(upto * (pts.length - 1)));
        ctx!.strokeStyle = color;
        ctx!.lineWidth = width;
        let pen = false;
        ctx!.beginPath();
        for (let k = 0; k <= n; k++) {
          const pt = project(pts[k].lat, pts[k].lon, pts[k].h);
          if (pt.visible) {
            if (pen) ctx!.lineTo(pt.x, pt.y);
            else ctx!.moveTo(pt.x, pt.y);
            pen = true;
          } else pen = false;
        }
        ctx!.stroke();
      };
      routes.forEach((_, i) => i !== s.active && drawRoute(i, 1, "rgba(226, 199, 174, 0.18)", 1));
      const grow = still ? 1 : Math.min(1, t / 1.2);
      const eased = 1 - Math.pow(1 - grow, 3);
      drawRoute(s.active, eased, "#7f9fd0", 2);

      // Travelling pulse along the active route
      if (!still && grow >= 1) {
        const u = ((t - 1.2) % 1.6) / 1.6;
        const pts = routes[s.active];
        const q = pts[Math.min(pts.length - 1, Math.floor(u * (pts.length - 1)))];
        const pt = project(q.lat, q.lon, q.h);
        if (pt.visible) {
          ctx!.fillStyle = "#f7efe8";
          ctx!.beginPath();
          ctx!.arc(pt.x, pt.y, 2.6, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      // Destinations
      dests.forEach((d, i) => {
        const pt = project(d[0], d[1]);
        if (!pt.visible) return;
        const on = i === s.active;
        ctx!.fillStyle = on ? "#f7efe8" : "rgba(247, 239, 232, 0.55)";
        ctx!.beginPath();
        ctx!.arc(pt.x, pt.y, on ? 3.6 : 2.2, 0, Math.PI * 2);
        ctx!.fill();
        if (on && eased >= 1) {
          ctx!.font = `500 ${Math.max(10, size * 0.026)}px ${font}`;
          ctx!.fillStyle = "#f7efe8";
          ctx!.textBaseline = "middle";
          const label = regions[i].toUpperCase();
          const w = ctx!.measureText(label).width;
          const right = pt.x + 10 + w < size - 4;
          ctx!.textAlign = right ? "left" : "right";
          ctx!.fillText(label, right ? pt.x + 10 : pt.x - 10, pt.y);
        }
      });

      // Agra, with a slow pulse
      const o = project(ORIGIN[0], ORIGIN[1]);
      if (o.visible) {
        const pulse = still ? 0 : (now / 1800) % 1;
        ctx!.strokeStyle = `rgba(199, 154, 116, ${0.75 * (1 - pulse)})`;
        ctx!.lineWidth = 1.2;
        ctx!.beginPath();
        ctx!.arc(o.x, o.y, 4 + pulse * 14, 0, Math.PI * 2);
        ctx!.stroke();
        ctx!.fillStyle = "#c79a74";
        ctx!.beginPath();
        ctx!.arc(o.x, o.y, 4.2, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.font = `500 ${Math.max(10, size * 0.026)}px ${font}`;
        ctx!.fillStyle = "#e2c7ae";
        ctx!.textAlign = "right";
        ctx!.textBaseline = "middle";
        ctx!.fillText("AGRA", o.x - 11, o.y);
      }
    }

    let raf = 0;
    const loop = (now: number) => {
      draw(now);
      raf = requestAnimationFrame(loop);
    };
    if (still || !running) draw(performance.now());
    else raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [regions, running, active]);

  return <canvas ref={canvasRef} aria-hidden className="block h-full w-full font-mono" />;
}
