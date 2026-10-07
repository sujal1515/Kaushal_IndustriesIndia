"use client";

import { useRef, type ReactNode } from "react";
import { gsap, motionActive, ScrollTrigger, SplitText, useGSAP } from "./gsap";
import { initGridLines } from "./grid-lines";

/**
 * Scroll motion for each page. Mounted by app/(site)/template.tsx, so it re-runs on every
 * navigation and reverts cleanly (gsap.context via useGSAP). Hero text animates with CSS at
 * first paint (globals.css .reveal / .fade-up), so it never waits for scripts.
 *
 *   data-split                 heading lines rise out of masks as they come into view
 *   data-scramble              mono labels resolve from scrambled characters
 *   data-rise                  children rise in sequence (grids, lists)
 *   data-stagger="0.08"        children rise in sequence with a custom stagger
 *   data-reveal                element fades up
 *   data-parallax="trigger"    child [data-parallax="target"] (or itself) drifts with scroll
 *   data-hero-parallax         hero content drifts down slightly as it scrolls away
 *   data-count                 number counts up when seen
 *   data-grid-draw             grid lines draw themselves in (see grid-lines.ts)
 *
 * Nothing is hidden or animated unless <html> has the `motion` class (set before paint when
 * reduced motion is off; removed by a 3s fallback if scripts never start).
 */
export function MotionScope({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      (window as unknown as { __motionReady?: boolean }).__motionReady = true;
      const root = ref.current;
      if (!root || !motionActive()) return;

      // The page, plus persistent layout regions (footer CTA) marked data-motion-global.
      const containers = [root, ...Array.from(document.querySelectorAll<HTMLElement>("[data-motion-global]"))];
      const q = <T extends HTMLElement = HTMLElement>(sel: string) =>
        containers.flatMap((c) => Array.from(c.querySelectorAll<T>(sel)));
      const splits: SplitText[] = [];
      const cleanups: (() => void)[] = [];
      const ease = "expo.out";
      const start = "top 88%";

      /* Headings: lines rise out of masks */
      q("[data-split]").forEach((el) => {
        const s = SplitText.create(el, {
          type: "lines",
          mask: "lines",
          linesClass: "split-line",
          autoSplit: true,
          onSplit: (self) => {
            gsap.set(el, { visibility: "visible" });
            return gsap.fromTo(
              self.lines,
              { yPercent: 105 },
              { yPercent: 0, duration: 0.85, ease, stagger: 0.07, scrollTrigger: { trigger: el, start, once: true } },
            );
          },
        });
        splits.push(s);
      });

      /* Labels: scrambled characters resolve */
      q("[data-scramble]").forEach((el) => {
        const s = SplitText.create(el, { type: "words, chars" });
        splits.push(s);
        gsap.to(s.words, {
          duration: 0.9,
          stagger: 0.012,
          ease: "none",
          scrambleText: { text: "{original}", chars: "upperCase", speed: 1.2 },
          scrollTrigger: { trigger: el, start: "top 95%", once: true },
          onComplete: () => s.revert(),
        });
      });

      /* Groups rise in sequence */
      const rise = (items: Element[], trigger: Element, stagger: number) =>
        gsap.fromTo(
          items,
          { autoAlpha: 0, y: 48 },
          { autoAlpha: 1, y: 0, duration: 0.9, ease, stagger, scrollTrigger: { trigger, start, once: true } },
        );
      q("[data-rise]").forEach((group) => {
        const items = Array.from(group.children);
        if (items.length) rise(items, group, 0.08);
      });
      q("[data-stagger]").forEach((group) => {
        rise(Array.from(group.children), group, Number(group.dataset.stagger) || 0.08);
      });
      q("[data-reveal]").forEach((el) => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: 32 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.9,
            ease,
            delay: Number(el.dataset.delay || 0),
            scrollTrigger: { trigger: el, start, once: true },
          },
        );
      });

      /* Parallax (bands with drafting-grid backgrounds) */
      q("[data-parallax='trigger']").forEach((trigger) => {
        const target = trigger.querySelector<HTMLElement>("[data-parallax='target']") ?? trigger;
        const from = trigger.dataset.parallaxStart !== undefined ? Number(trigger.dataset.parallaxStart) : 20;
        const to = trigger.dataset.parallaxEnd !== undefined ? Number(trigger.dataset.parallaxEnd) : -20;
        gsap.fromTo(
          target,
          { yPercent: from },
          {
            yPercent: to,
            ease: "none",
            scrollTrigger: {
              trigger,
              start: `clamp(${trigger.dataset.parallaxScrollStart || "top bottom"})`,
              end: `clamp(${trigger.dataset.parallaxScrollEnd || "bottom top"})`,
              scrub: true,
            },
          },
        );
      });

      /* Hero drifts down slightly as the page scrolls over it. The drift starts only once the
         hero's bottom edge is on screen, so a tall (stacked) hero never slides its last lines
         under the next section before they have been read. */
      q("[data-hero-parallax]").forEach((el) => {
        gsap.fromTo(
          el,
          { y: 0 },
          {
            y: () => Math.min(el.offsetHeight, window.innerHeight) * 0.1,
            ease: "none",
            scrollTrigger: { trigger: el, start: "clamp(bottom bottom)", end: "bottom top", scrub: 0.6, invalidateOnRefresh: true },
          },
        );
      });

      /* Counters (markup holds the final value, so no-JS and SEO see the real number) */
      q("[data-count]").forEach((el) => {
        const end = Number(el.dataset.count);
        const from = Number(el.dataset.from ?? 0);
        const suffix = el.dataset.suffix ?? "";
        const state = { v: from };
        el.textContent = `${from}${suffix}`;
        gsap.to(state, {
          v: end,
          duration: 1.6,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 92%", once: true },
          onUpdate: () => {
            el.textContent = `${Math.round(state.v)}${suffix}`;
          },
        });
      });

      /* Grid lines draw themselves in (cell grids, tables, ruled lists, section rules) */
      cleanups.push(initGridLines(gsap, ScrollTrigger));

      // Recalculate trigger positions once images and fonts settle.
      const refresh = () => ScrollTrigger.refresh();
      window.addEventListener("load", refresh, { once: true });
      document.fonts?.ready.then(refresh);
      cleanups.push(() => window.removeEventListener("load", refresh));

      return () => {
        cleanups.forEach((c) => c());
        splits.forEach((s) => s.revert());
      };
    },
    { scope: ref },
  );

  return <div ref={ref}>{children}</div>;
}
