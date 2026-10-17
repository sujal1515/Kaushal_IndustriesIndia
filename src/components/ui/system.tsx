import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Layout primitives of the reference design system:
 * full-bleed gutters, a mono label bar opening each section, a large gap, then the heading.
 */

/** Long arrow used by large links and the cursor label. */
export function ArrowLong({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 28" fill="none" aria-hidden focusable="false" className={className}>
      <path d="M26 0 23.2 2.8l9.2 9.2H0v4h32.4l-9.2 9.2L26 28l14-14L26 0Z" fill="currentColor" />
    </svg>
  );
}

/** Mono label bar opening a section (the label rises out of a mask as it scrolls into view). */
export function SectionTop({ label, className }: { label: string; className?: string }) {
  return (
    <div className={cn("top-elements", className)}>
      <p className="eyebrow" data-split>
        {label}
      </p>
    </div>
  );
}

/**
 * A page section: paper background, gutters, optional hairline, label bar and heading gap.
 */
export function Section({
  id,
  label,
  rule = true,
  gap = "lg",
  end = "lg",
  className,
  innerClassName,
  labelledBy,
  ariaLabel,
  children,
}: {
  id?: string;
  label?: string;
  rule?: boolean;
  gap?: "lg" | "sm" | "none";
  end?: "lg" | "sm" | "none";
  className?: string;
  innerClassName?: string;
  labelledBy?: string;
  ariaLabel?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} aria-label={ariaLabel} className={cn("section", className)}>
      <div className="padding-global">
        <div className={cn(rule && "section-rule", end === "lg" && "section-end", end === "sm" && "section-end-sm")}>
          {label && <SectionTop label={label} />}
          <div className={cn(gap === "lg" && "section-inner", gap === "sm" && "section-inner-sm", innerClassName)}>{children}</div>
        </div>
      </div>
    </section>
  );
}

/** Label + arrow for a "large link" — wrap it in a Link/anchor with className="large-link". */
export function LargeLinkLabel({ children }: { children: ReactNode }) {
  return (
    <>
      <ArrowLong />
      <span className="h3">{children}</span>
    </>
  );
}

