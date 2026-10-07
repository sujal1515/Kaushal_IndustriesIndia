"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP } from "./gsap";

/**
 * Marquee in the reference style: loops continuously, flips direction with the scroll
 * direction, and drifts sideways (±10vw) as it passes through the viewport. Static with
 * reduced motion.
 */
export function Marquee({ items }: { items: string[] }) {
  const root = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const marquee = root.current;
      const scroll = scroller.current;
      if (!marquee || !scroll || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const collections = marquee.querySelectorAll<HTMLElement>("[data-marquee-collection]");
      const direction = 1; // starts moving right
      const scrollSpeed = 10; // vw of drift across the viewport passage
      const speedMultiplier = window.innerWidth < 479 ? 0.25 : window.innerWidth < 991 ? 0.5 : 1;
      const duration = 50 * (collections[0].offsetWidth / window.innerWidth) * speedMultiplier;

      gsap.set(scroll, { marginLeft: `${-scrollSpeed}%`, width: `${scrollSpeed * 2 + 100}%` });
      // Started half-way through an endless loop so it can run either way indefinitely.
      const loop = gsap
        .fromTo(collections, { xPercent: 0 }, { xPercent: -100, repeat: -1, duration, ease: "none" })
        .totalProgress(0.5);
      loop.timeScale(direction);

      ScrollTrigger.create({
        trigger: marquee,
        start: "top bottom",
        end: "bottom top",
        onUpdate: (self) => loop.timeScale(self.direction === 1 ? -direction : direction),
      });
      gsap.fromTo(
        scroll,
        { x: `${-scrollSpeed}vw` },
        { x: `${scrollSpeed}vw`, ease: "none", scrollTrigger: { trigger: marquee, start: "0% 100%", end: "100% 0%", scrub: 0 } },
      );
    },
    { scope: root },
  );

  const collection = (hidden: boolean) => (
    <ul data-marquee-collection className="marquee-collection items-center" aria-hidden={hidden || undefined}>
      {items.map((t, i) => (
        <li key={`${t}-${i}`} className="flex items-center whitespace-nowrap">
          <span className="h2 px-10">{t}</span>
          <span className="text-[2rem] text-accent" aria-hidden>
            ✦
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <div ref={root} className="section marquee py-16 md:py-24">
      <div ref={scroller} className="marquee-scroll">
        {collection(false)}
        {collection(true)}
        {collection(true)}
      </div>
    </div>
  );
}
