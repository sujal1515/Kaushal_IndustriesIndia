import type { gsap as GSAP } from "gsap";
import type { ScrollTrigger as ST } from "gsap/ScrollTrigger";

/**
 * Grid lines that draw themselves in as they scroll into view.
 *
 * Targets: [data-grid-draw], .section-rule, .start-grid, .product-grid. Until a target has drawn,
 * its own borders and its children's borders are hidden (globals.css, only under html.motion), so
 * nothing flashes; once the lines are drawn the real borders come back underneath and the drawn
 * lines are removed.
 *
 * data-grid-draw tokens:
 *   (none)      each bordered element (the target and its children) draws its own rules, which
 *               move with it — right for lists and card grids whose items rise in
 *   cells       the whole grid is measured and drawn as continuous lines: rows sweep across,
 *               then columns drop — right for cell grids and tables
 *   rows:<sel>  also measure descendants matching <sel> (e.g. rows:tr for tables)
 *   fade        cells mode: the cells' contents fade up once the lines are in
 */

const TARGETS = "[data-grid-draw], .section-rule, .start-grid, .product-grid";
const HOT = "rgb(153 111 81 / 0.95)"; // lines draw in bronze, then settle to their own colour

type Line = { el: HTMLElement; horizontal: boolean; key: number; color: string };

const edgesOf = (el: Element) => {
  const cs = getComputedStyle(el);
  const side = (s: "Top" | "Right" | "Bottom" | "Left") => {
    const w = parseFloat(cs.getPropertyValue(`border-${s.toLowerCase()}-width`)) || 0;
    const style = cs.getPropertyValue(`border-${s.toLowerCase()}-style`);
    const color = cs.getPropertyValue(`border-${s.toLowerCase()}-color`);
    const visible = w > 0 && style !== "none" && style !== "hidden" && !/rgba\(.*,\s*0\)$|transparent/.test(color);
    return visible ? { w, color } : null;
  };
  return { top: side("Top"), right: side("Right"), bottom: side("Bottom"), left: side("Left"), display: cs.display };
};

const span = (parent: HTMLElement, css: Partial<CSSStyleDeclaration>) => {
  const s = document.createElement("span");
  s.setAttribute("aria-hidden", "true");
  Object.assign(s.style, { position: "absolute", pointerEvents: "none", zIndex: "3", display: "block" }, css);
  parent.appendChild(s);
  return s;
};

/** Each bordered element draws its own rules (they ride along with the element's own motion). */
function itemLines(target: HTMLElement, restore: (() => void)[]) {
  const lines: Line[] = [];
  const els = [target, ...Array.from(target.children)] as HTMLElement[];
  for (const el of els) {
    const e = edgesOf(el);
    if (e.display === "contents" || e.display === "none" || el.tagName === "DETAILS") continue;
    if (!e.top && !e.right && !e.bottom && !e.left) continue;
    if (getComputedStyle(el).position === "static") {
      const prev = el.style.position;
      el.style.position = "relative";
      restore.push(() => (el.style.position = prev));
    }
    const bt = e.top?.w ?? 0;
    const bl = e.left?.w ?? 0;
    const W = el.offsetWidth;
    const H = el.offsetHeight;
    if (e.top) lines.push({ el: span(el, { left: `${-bl}px`, top: `${-bt}px`, width: `${W}px`, height: `${e.top.w}px` }), horizontal: true, key: 0, color: e.top.color });
    if (e.bottom) lines.push({ el: span(el, { left: `${-bl}px`, top: `${H - bt - e.bottom.w}px`, width: `${W}px`, height: `${e.bottom.w}px` }), horizontal: true, key: H, color: e.bottom.color });
    if (e.left) lines.push({ el: span(el, { left: `${-bl}px`, top: `${-bt}px`, width: `${e.left.w}px`, height: `${H}px` }), horizontal: false, key: 0, color: e.left.color });
    if (e.right) lines.push({ el: span(el, { left: `${W - bl - e.right.w}px`, top: `${-bt}px`, width: `${e.right.w}px`, height: `${H}px` }), horizontal: false, key: W, color: e.right.color });
  }
  return lines;
}

/** The grid is measured as a whole and drawn as continuous lines in an overlay. */
function cellLines(target: HTMLElement, rowsSel: string | null, restore: (() => void)[]) {
  const ts = getComputedStyle(target);
  const clips = ts.overflowX !== "visible" || ts.overflowY !== "visible";
  const host = (clips ? target.parentElement : target) ?? target;
  if (getComputedStyle(host).position === "static") {
    const prev = host.style.position;
    host.style.position = "relative";
    restore.push(() => (host.style.position = prev));
  }
  const tr = target.getBoundingClientRect();
  const hr = host.getBoundingClientRect();
  const overlay = span(host, {
    left: `${tr.left - hr.left - host.clientLeft}px`,
    top: `${tr.top - hr.top - host.clientTop}px`,
    width: `${tr.width}px`,
    height: `${tr.height}px`,
    overflow: clips ? "hidden" : "visible",
  });
  restore.push(() => overlay.remove());

  type Seg = { a: number; b: number; w: number; color: string };
  const H = new Map<number, Seg[]>();
  const V = new Map<number, Seg[]>();
  const add = (m: Map<number, Seg[]>, at: number, seg: Seg) => {
    const k = Math.round(at);
    m.set(k, [...(m.get(k) ?? []), seg]);
  };
  const els = [target, ...Array.from(target.children), ...(rowsSel ? Array.from(target.querySelectorAll(rowsSel)) : [])];
  for (const el of els) {
    const e = edgesOf(el);
    if (e.display === "contents" || e.display === "none") continue;
    const r = el.getBoundingClientRect();
    const x = r.left - tr.left;
    const y = r.top - tr.top;
    if (e.top) add(H, y, { a: x, b: x + r.width, w: e.top.w, color: e.top.color });
    if (e.bottom) add(H, y + r.height - e.bottom.w, { a: x, b: x + r.width, w: e.bottom.w, color: e.bottom.color });
    if (e.left) add(V, x, { a: y, b: y + r.height, w: e.left.w, color: e.left.color });
    if (e.right) add(V, x + r.width - e.right.w, { a: y, b: y + r.height, w: e.right.w, color: e.right.color });
  }
  const merge = (segs: Seg[]) => {
    const out: Seg[] = [];
    [...segs].sort((p, q) => p.a - q.a).forEach((s) => {
      const last = out[out.length - 1];
      if (last && s.a <= last.b + 2) last.b = Math.max(last.b, s.b);
      else out.push({ ...s });
    });
    return out;
  };
  const lines: Line[] = [];
  for (const [at, segs] of [...H.entries()].sort((p, q) => p[0] - q[0]))
    for (const s of merge(segs))
      lines.push({ el: span(overlay, { left: `${s.a}px`, top: `${at}px`, width: `${s.b - s.a}px`, height: `${s.w}px` }), horizontal: true, key: at, color: s.color });
  for (const [at, segs] of [...V.entries()].sort((p, q) => p[0] - q[0]))
    for (const s of merge(segs))
      lines.push({ el: span(overlay, { left: `${at}px`, top: `${s.a}px`, width: `${s.w}px`, height: `${s.b - s.a}px` }), horizontal: false, key: at, color: s.color });
  return lines;
}

export function initGridLines(gsap: typeof GSAP, ScrollTrigger: typeof ST) {
  const triggers: ST[] = [];
  const timelines: gsap.core.Timeline[] = [];
  const pending: (() => void)[] = [];

  document.querySelectorAll<HTMLElement>(TARGETS).forEach((target) => {
    if (target.hasAttribute("data-grid-drawn")) return;
    const tokens = (target.dataset.gridDraw ?? "").split(/\s+/).filter(Boolean);
    const cells = tokens.includes("cells");
    const fade = cells && tokens.includes("fade");
    const rowsSel = tokens.find((t) => t.startsWith("rows:"))?.slice(5) || null;
    const contents = fade ? (Array.from(target.children).flatMap((c) => Array.from(c.children)) as HTMLElement[]) : [];

    const done = () => target.setAttribute("data-grid-drawn", "");
    const restore: (() => void)[] = [];
    const undo = () => {
      restore.forEach((r) => r());
      restore.length = 0;
    };
    const finish = () => {
      done();
      undo();
    };
    // On teardown, a grid that hasn't finished drawing is put back to pending (lines hidden) and
    // is drawn again by the next init — e.g. the footer after a page change.
    pending.push(() => {
      if (!target.hasAttribute("data-grid-drawn")) undo();
    });

    const play = () => {
      // Read the real borders for a moment, then hide them again behind the drawn lines.
      target.setAttribute("data-grid-measure", "");
      const lines = cells ? cellLines(target, rowsSel, restore) : itemLines(target, restore);
      target.removeAttribute("data-grid-measure");
      if (!lines.length) {
        finish();
        if (contents.length) gsap.to(contents, { autoAlpha: 1, y: 0, duration: 0.6 });
        return;
      }
      if (!cells) restore.push(() => lines.forEach((l) => l.el.remove()));
      const hs = lines.filter((l) => l.horizontal).sort((p, q) => p.key - q.key);
      const vs = lines.filter((l) => !l.horizontal).sort((p, q) => p.key - q.key);
      const each = (n: number) => Math.min(0.09, 0.8 / Math.max(1, n));
      const tl = gsap.timeline({ onComplete: finish });
      hs.forEach((l) => Object.assign(l.el.style, { background: HOT, transformOrigin: "0% 50%", transform: "scaleX(0)" }));
      vs.forEach((l) => Object.assign(l.el.style, { background: HOT, transformOrigin: "50% 0%", transform: "scaleY(0)" }));
      if (hs.length) tl.to(hs.map((l) => l.el), { scaleX: 1, duration: 1.15, ease: "expo.inOut", stagger: each(hs.length) }, 0);
      if (vs.length) tl.to(vs.map((l) => l.el), { scaleY: 1, duration: 1.05, ease: "expo.inOut", stagger: each(vs.length) }, hs.length ? 0.3 : 0);
      const ordered = [...hs, ...vs];
      tl.to(ordered.map((l) => l.el), { backgroundColor: (i: number) => ordered[i].color, duration: 0.7, ease: "power2.out", stagger: 0.02 }, ">-0.45");
      if (contents.length) tl.to(contents, { autoAlpha: 1, y: 0, duration: 0.8, ease: "expo.out", stagger: 0.06 }, 0.55);
      timelines.push(tl);
    };

    const r = target.getBoundingClientRect();
    if (r.bottom < 0) {
      // Already scrolled past: just show it.
      done();
      return;
    }
    if (contents.length) gsap.set(contents, { autoAlpha: 0, y: 14 });
    triggers.push(ScrollTrigger.create({ trigger: target, start: "top 90%", once: true, onEnter: play }));
  });

  return () => {
    triggers.forEach((t) => t.kill());
    timelines.forEach((t) => t.kill());
    pending.forEach((f) => f());
  };
}
