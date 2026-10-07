"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { gsap, useGSAP } from "@/components/motion/gsap";
import { ArrowLeft, ArrowRight } from "@/components/ui/icons";

gsap.registerPlugin(Draggable, InertiaPlugin);

type Row = { slug: string; name: string; summary: string | null; image: string | null };

/**
 * Draggable slider in the reference style (GSAP Draggable + Inertia): 3 / 2.25 / 1.15 slides
 * per view, snapping per slide, slides outside the view dimmed, prev/next controls.
 * Without JS it is a plain horizontally scrollable list.
 */
export function ApplicationSlider({ rows }: { rows: Row[] }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const collection = el.querySelector<HTMLElement>("[data-slider-collection]")!;
      const track = el.querySelector<HTMLElement>("[data-slider-list]")!;
      const items = Array.from(track.querySelectorAll<HTMLElement>("[data-slider-item]"));
      const controls = Array.from(el.querySelectorAll<HTMLButtonElement>("[data-slider-control]"));
      let draggable: Draggable | null = null;
      let snapPoints: number[] = [0];
      let active = 0;
      let lastWidth = 0;

      const updateStatus = (x: number) => {
        const minX = snapPoints[snapPoints.length - 1];
        const clamped = Math.min(0, Math.max(minX, x));
        active = snapPoints.reduce((best, pt, i) => (Math.abs(pt - clamped) < Math.abs(snapPoints[best] - clamped) ? i : best), 0);
        const box = collection.getBoundingClientRect();
        items.forEach((slide, i) => {
          const r = slide.getBoundingClientRect();
          const center = r.left - box.left + r.width / 2;
          const inView = center > 0 && center < box.width;
          slide.dataset.status = i === active ? "active" : inView ? "inview" : "not-active";
        });
        controls.forEach((btn) => {
          const can = btn.dataset.sliderControl === "prev" ? active > 0 : active < snapPoints.length - 1;
          btn.disabled = !can;
        });
      };

      const setup = () => {
        draggable?.kill();
        lastWidth = window.innerWidth;
        const slideW = items[0].getBoundingClientRect().width + parseFloat(getComputedStyle(items[0]).marginRight);
        const maxScroll = Math.max(track.scrollWidth - collection.clientWidth, 0);
        if (maxScroll < 2) {
          el.dataset.status = "not-active";
          gsap.set(track, { x: 0 });
          snapPoints = [0];
          updateStatus(0);
          return;
        }
        el.dataset.status = "active";
        const maxIndex = maxScroll / slideW;
        snapPoints = Array.from({ length: Math.floor(maxIndex) + 1 }, (_, i) => -i * slideW);
        if (Math.floor(maxIndex) < maxIndex) snapPoints.push(-maxScroll);
        const setX = gsap.quickSetter(track, "x", "px") as (v: number) => void;
        draggable = Draggable.create(track, {
          type: "x",
          inertia: true,
          bounds: { minX: -maxScroll, maxX: 0 },
          throwResistance: 2000,
          dragResistance: 0.05,
          maxDuration: 0.6,
          minDuration: 0.2,
          edgeResistance: 0.75,
          dragClickables: true,
          snap: { x: snapPoints },
          onPress() {
            track.dataset.status = "grabbing";
          },
          onDrag() {
            setX(this.x);
            updateStatus(this.x);
          },
          onThrowUpdate() {
            setX(this.x);
            updateStatus(this.x);
          },
          onThrowComplete() {
            updateStatus(this.endX);
            track.dataset.status = "grab";
          },
          onRelease() {
            updateStatus(this.x);
            track.dataset.status = "grab";
          },
        })[0];
        gsap.set(track, { x: 0 });
        updateStatus(0);
      };

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const go = (index: number) => {
        const target = Math.max(0, Math.min(snapPoints.length - 1, index));
        gsap.to(track, {
          x: snapPoints[target],
          duration: reduce ? 0 : 0.4,
          onUpdate: () => {
            draggable?.update();
            updateStatus(Number(gsap.getProperty(track, "x")));
          },
        });
      };

      const onControl = (e: Event) => {
        const dir = (e.currentTarget as HTMLElement).dataset.sliderControl;
        go(active + (dir === "next" ? 1 : -1));
      };
      // Keyboard users: bring a focused slide into view.
      const onFocus = (e: FocusEvent) => {
        const i = items.findIndex((slide) => slide.contains(e.target as Node));
        if (i >= 0) {
          collection.scrollLeft = 0;
          go(Math.min(i, snapPoints.length - 1));
        }
      };
      let timer: ReturnType<typeof setTimeout>;
      const onResize = () => {
        clearTimeout(timer);
        timer = setTimeout(() => window.innerWidth !== lastWidth && setup(), 200);
      };

      setup();
      controls.forEach((b) => b.addEventListener("click", onControl));
      track.addEventListener("focusin", onFocus);
      window.addEventListener("resize", onResize);
      return () => {
        draggable?.kill();
        clearTimeout(timer);
        controls.forEach((b) => b.removeEventListener("click", onControl));
        track.removeEventListener("focusin", onFocus);
        window.removeEventListener("resize", onResize);
      };
    },
    { scope: root },
  );

  return (
    <div ref={root} className="group/slider flex w-full flex-col gap-12 overflow-hidden px-6 max-[767px]:px-4" data-status="not-active">
      <div data-slider-collection className="w-full max-w-[100vw] overflow-x-auto [scrollbar-width:none] group-data-[status=active]/slider:overflow-visible">
        <ul
          data-slider-list
          className="flex touch-pan-y select-none will-change-transform [--gap:1.5rem] [--spv:3] max-[991px]:[--spv:2.25] max-[767px]:[--gap:1rem] max-[767px]:[--spv:1.15] data-[status=grab]:cursor-grab data-[status=grabbing]:cursor-grabbing"
        >
          {rows.map((a, i) => (
            <li
              key={a.slug}
              data-slider-item
              className="group/slide mr-[var(--gap)] w-[calc((100%-(var(--spv)-1)*var(--gap))/var(--spv))] flex-none last:mr-0"
            >
              <Link
                href={`/applications/${a.slug}`}
                draggable={false}
                className="group relative flex h-[60vh] min-h-[26rem] flex-col justify-end overflow-hidden bg-stone transition-opacity duration-300 group-data-[status=not-active]/slide:opacity-20"
              >
                {a.image && (
                  <div className="product-tile absolute inset-x-0 top-0 h-[62%]">
                    <Image
                      src={a.image}
                      alt=""
                      fill
                      sizes="(min-width: 992px) 30vw, (min-width: 768px) 45vw, 90vw"
                      className="media-zoom object-contain p-[12%]"
                      draggable={false}
                    />
                  </div>
                )}
                <div className="relative flex flex-col gap-3 p-8 max-[767px]:p-6">
                  <span className="eyebrow">{String(i + 1).padStart(2, "0")}</span>
                  <span className="h3">
                    <span className="u-link">{a.name}</span>
                  </span>
                  <span className="line-clamp-3 text-[1rem] font-medium leading-relaxed text-muted">{a.summary}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="hidden items-center justify-end gap-2 group-data-[status=active]/slider:flex">
        <button
          type="button"
          data-slider-control="prev"
          aria-label="Previous slide"
          className="grid h-14 w-14 place-items-center rounded-[0.25rem] border border-line-strong text-ink transition-[opacity,border-color] duration-300 hover:border-ink disabled:pointer-events-none disabled:opacity-20"
        >
          <ArrowLeft size={22} />
        </button>
        <button
          type="button"
          data-slider-control="next"
          aria-label="Next slide"
          className="grid h-14 w-14 place-items-center rounded-[0.25rem] border border-line-strong text-ink transition-[opacity,border-color] duration-300 hover:border-ink disabled:pointer-events-none disabled:opacity-20"
        >
          <ArrowRight size={22} />
        </button>
      </div>
    </div>
  );
}
