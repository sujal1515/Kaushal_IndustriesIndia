"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, useGSAP);

// The reference design's navigation ease.
CustomEase.create("main", "0.65, 0.01, 0.05, 0.99");

// Development-only handle for inspecting triggers from the browser console.
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  (window as unknown as { __gsap?: unknown }).__gsap = { gsap, ScrollTrigger, SplitText };
}

export { gsap, ScrollTrigger, SplitText, useGSAP };

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** True while the CSS pre-hide is active (set before paint by the motion boot script). */
export const motionActive = () => typeof document !== "undefined" && document.documentElement.classList.contains("motion");
