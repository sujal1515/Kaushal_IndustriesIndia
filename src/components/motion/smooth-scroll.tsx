"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "./gsap";

/**
 * Inertial smooth scrolling (Lenis) driven by GSAP's ticker so ScrollTrigger stays in sync.
 * Native scroll position is used throughout, so position: sticky, anchors and browser find
 * still work. Off for reduced motion; touch devices keep their native momentum scrolling.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({
      lerp: 0.12,
      wheelMultiplier: 1,
      gestureOrientation: "vertical",
      smoothWheel: true,
      // Clear the sticky header and the product page's section bar when jumping to anchors.
      anchors: { offset: -136 },
      autoRaf: false,
    });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    // The side navigation pauses page scrolling while it is open.
    const w = window as unknown as { __lenis?: Lenis };
    w.__lenis = lenis;
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      if (w.__lenis === lenis) delete w.__lenis;
    };
  }, []);
  return null;
}
