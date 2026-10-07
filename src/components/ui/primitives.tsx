import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { absoluteUrl } from "@/lib/site";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "warn" | "danger" | "dark";
  className?: string;
}) {
  const tones = {
    neutral: "bg-ink/[0.06] text-ink-soft",
    accent: "bg-accent-soft text-accent-strong",
    warn: "bg-warn-soft text-warn",
    danger: "bg-danger-soft text-danger",
    dark: "bg-ink text-white",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[0.25rem] px-2 py-1 font-mono text-[0.75rem] font-medium uppercase leading-none tracking-[-0.01em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  if (status === "coming_soon") return <Badge tone="warn">Coming soon</Badge>;
  if (status === "discontinued") return <Badge tone="neutral">Discontinued</Badge>;
  return null;
}

/**
 * Section heading block: large split heading (left, ~48rem) with the lead and action in a
 * column beside it — the reference "heading + sticky text" pairing.
 */
export function SectionHeader({
  title,
  lead,
  action,
  className,
  id,
  as: Tag = "h2",
}: {
  title: ReactNode;
  lead?: ReactNode;
  action?: ReactNode;
  className?: string;
  id?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("grid gap-8 lg:grid-cols-[3fr_2fr] lg:items-end lg:gap-24", className)}>
      <Tag id={id} className="h2 max-w-[48rem]" data-split>
        {title}
      </Tag>
      {(lead || action) && (
        <div className="flex flex-col items-start gap-8">
          {lead && (
            <p className="lead" data-reveal>
              {lead}
            </p>
          )}
          {action && <div data-reveal>{action}</div>}
        </div>
      )}
    </div>
  );
}

/** Minimal, safe markdown: paragraphs, "- " bullet lists and line breaks. No HTML is ever injected. */
export function Prose({ text, className }: { text: string | null | undefined; className?: string }) {
  if (!text) return null;
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className={cn("prose-body", className)}>
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const bullets = lines.filter((l) => /^\s*[-*]\s+/.test(l));
        if (bullets.length && bullets.length === lines.length) {
          return (
            <ul key={i}>
              {bullets.map((l, j) => (
                <li key={j}>{l.replace(/^\s*[-*]\s+/, "")}</li>
              ))}
            </ul>
          );
        }
        if (bullets.length) {
          const intro = lines.filter((l) => !/^\s*[-*]\s+/.test(l));
          return (
            <Fragment key={i}>
              <p>{intro.join(" ")}</p>
              <ul>
                {bullets.map((l, j) => (
                  <li key={j}>{l.replace(/^\s*[-*]\s+/, "")}</li>
                ))}
              </ul>
            </Fragment>
          );
        }
        return <p key={i}>{lines.join(" ")}</p>;
      })}
    </div>
  );
}

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is escaped for "<" to prevent breaking out of the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export type Crumb = { label: string; href: string };

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  const all = [{ label: "Home", href: "/" }, ...items];
  return (
    <>
      <nav aria-label="Breadcrumb" className={cn("no-print", className)}>
        <ol className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[0.875rem] font-medium uppercase leading-snug tracking-[-0.01em] text-muted">
          {all.map((c, i) => {
            const last = i === all.length - 1;
            return (
              <li key={c.href} className="flex items-center gap-2.5">
                {last ? (
                  <span aria-current="page" className="text-ink">
                    {c.label}
                  </span>
                ) : (
                  <>
                    <Link href={c.href} className="u-link transition-colors hover:text-ink">
                      {c.label}
                    </Link>
                    <span aria-hidden className="opacity-50">
                      /
                    </span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: all.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.label,
            item: absoluteUrl(c.href),
          })),
        }}
      />
    </>
  );
}

/** A block that rises out of its own mask at first paint (CSS; --d is the delay in seconds). */
export function Reveal({ children, delay = 0.15, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <span className={cn("reveal", className)}>
      <span style={{ "--d": `${delay}s` } as React.CSSProperties}>{children}</span>
    </span>
  );
}

/**
 * Split hero used by every page: a media panel (60%) with the heading set bottom-left and a
 * brand panel (40%) with the lead and details. Compact on content pages so the page itself
 * starts above the fold; full height when it carries product media. Text rises in with CSS at
 * first paint, so it never waits on scripts. Stacks below 992px.
 */
export function PageHero({
  eyebrow,
  title,
  lead,
  crumbs,
  media,
  children,
  titleClassName,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  crumbs?: Crumb[];
  media?: ReactNode;
  children?: ReactNode;
  titleClassName?: string;
}) {
  const eyebrowEl =
    eyebrow &&
    (typeof eyebrow === "string" ? (
      <p className="h3">
        <Reveal delay={0.1}>{eyebrow}</Reveal>
      </p>
    ) : (
      <div className="h3 fade-up flex flex-wrap items-center gap-x-4 gap-y-2" style={{ "--d": "0.1s" } as React.CSSProperties}>
        {eyebrow}
      </div>
    ));
  return (
    <section className={cn("hero", media ? "hero--full" : undefined)} data-hero-parallax>
      <div className="hero-media">
        {!media && <div aria-hidden className="hero-grid" />}
        {crumbs && (
          <div className={cn("fade-up relative pb-8", !media && "mb-auto")} style={{ "--d": "0s" } as React.CSSProperties}>
            <Breadcrumbs items={crumbs} />
          </div>
        )}
        {media && (
          // Media fills the height left above the title, with the eyebrow beside it.
          <div className="relative flex min-h-0 flex-1 flex-col gap-8 pb-8 min-[992px]:flex-row min-[992px]:items-end">
            <div className="order-2 flex flex-col gap-4 min-[992px]:order-1 min-[992px]:flex-1">{eyebrowEl}</div>
            <div className="fade-up order-1 min-h-0 min-[992px]:order-2 min-[992px]:h-full" style={{ "--d": "0.05s" } as React.CSSProperties}>
              {media}
            </div>
          </div>
        )}
        <div className="relative flex flex-col gap-4">
          {!media && eyebrowEl}
          <h1 className={cn("h1 max-w-[18ch]", titleClassName)}>
            <Reveal delay={0.2}>{title}</Reveal>
          </h1>
        </div>
      </div>
      <div className="hero-panel">
        <div aria-hidden className="hero-panel-bg" />
        <div className="flex flex-col gap-8">
          {lead && (
            <p className="lead max-w-[32rem]">
              <Reveal delay={0.35}>{lead}</Reveal>
            </p>
          )}
          {children && (
            <div className="fade-up" style={{ "--d": "0.5s" } as React.CSSProperties}>
              {children}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** Spec list with hairlines and mono labels; `tone="inverse"` for the brand panel. */
export function DefinitionGrid({
  items,
  className,
  tone = "default",
}: {
  items: { label: string; value: ReactNode }[];
  className?: string;
  tone?: "default" | "inverse";
}) {
  const inverse = tone === "inverse";
  return (
    <dl className={cn("grid gap-x-8 sm:grid-cols-2", inverse ? "border-white/25" : "border-line", className)}>
      {items.map((it) => (
        <div key={it.label} className={cn("border-t py-4", inverse ? "border-white/25" : "border-line")}>
          <dt className={cn("font-mono text-[0.875rem] font-medium uppercase leading-snug", inverse ? "text-white/75" : "text-accent")}>
            {it.label}
          </dt>
          <dd className="mt-1.5 text-[1.125rem] font-medium leading-snug tracking-[-0.01em]">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
