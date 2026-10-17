import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import Link from "next/link";
import { getCatalogueStats, listApplications, listCategories } from "@/lib/data/catalogue";
import { mediaUrl } from "@/lib/env";
import { cmsMetadata, getPageContent } from "@/lib/cms/content";
import { fill } from "@/lib/cms/schema";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/primitives";
import { LargeLinkLabel, Section, SectionTop } from "@/components/ui/system";
import { ArrowRight } from "@/components/ui/icons";
import { TrackedLink } from "@/components/site/tracked";
import { ShowcaseProvider, ShowcaseRoller, ShowcaseStage } from "@/components/site/range-showcase";
import { ApplicationSlider } from "@/components/site/application-slider";
import { QualityExport } from "@/components/site/quality-export";
import { OrderSteps } from "@/components/site/order-steps";
import { Marquee } from "@/components/motion/marquee";

export const generateMetadata = () =>
  cmsMetadata("home", "/", { image: "/images/products/high-speed-air-cooled-single.png", absoluteTitle: true });

const delay = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;

export default async function HomePage() {
  const [categories, applications, stats, home, site] = await Promise.all([
    listCategories(),
    listApplications(),
    getCatalogueStats(),
    getPageContent("home"),
    getPageContent("global"),
  ]);
  // Figures: plain numbers (optionally with "+") count up; anything else is shown as written.
  const proof = home.proof.items.map((p) => {
    const value = fill(p.value, { models: stats.modelCount });
    const n = /^(\d+)(\+?)$/.exec(value.trim());
    if (!n) return { text: value, label: p.label };
    const count = Number(n[1]);
    return { count, from: count >= 1900 && count <= 2100 ? 1900 : 0, suffix: n[2], label: p.label };
  });
  const lines = categories.map((c) => {
    // Clean, upscaled cut-outs prepared for the hero (scripts/prepare-hero-images.py); any other
    // category falls back to its catalogue photo.
    const hero = `/images/hero/${c.slug}.png`;
    const cutout = existsSync(path.join(process.cwd(), "public", hero));
    return { slug: c.slug, name: c.name, image: cutout ? hero : mediaUrl(c.image_path), cutout };
  });

  return (
    <>
      {/* ============================ Hero ============================ */}
      {/* Three subs, read left to right:
          1. the statement — eyebrow and the two-part headline (stone);
          2. the product stage — the active line's photo alone on the surface;
          3. the range panel — the six lines rolling on a drum, then the lead, headline specs
             and the two primary actions (brand blue).
          Stage and drum move together every 5s. Text rises in with CSS at first paint, so the
          first impression never waits on scripts. */}
      <ShowcaseProvider lines={lines}>
        <section className="home-hero" data-hero-parallax>
          <div className="hh-sub hh-left">
            <p className="eyebrow">
              <Reveal delay={0.05}>{home.hero.eyebrow}</Reveal>
            </p>
            {/* Two-part headline: the product statement, then the provenance set large */}
            <h1 className="flex flex-col gap-5">
              <span className="h3 block">
                <Reveal delay={0.15}>{home.hero.kicker}</Reveal>
              </span>
              <span className="sr-only"> — </span>
              <span className="hh-display block">
                <Reveal delay={0.28}>{home.hero.display1} </Reveal>
                <Reveal delay={0.38}>{home.hero.display2}</Reveal>
              </span>
            </h1>
          </div>

          <ShowcaseStage className="hh-sub hh-middle" />

          <div className="hh-sub hh-right">
            <div aria-hidden className="hero-panel-bg" />
            <div className="fade-up" style={delay(0.55)}>
              <ShowcaseRoller label={home.hero.rangeLabel} />
            </div>
            <div className="hh-right-foot flex flex-col gap-8">
              <p className="lead max-w-[30rem]">
                <Reveal delay={0.62}>{home.hero.lead}</Reveal>
              </p>
              <dl className="fade-up grid grid-cols-3 gap-4 border-t border-white/20" style={delay(0.74)}>
                {home.hero.specs.map((s) => (
                  <div key={s.label} className="min-w-0 pt-4">
                    <dt className="font-mono text-[0.8125rem] font-medium uppercase leading-snug text-white/75">{s.label}</dt>
                    <dd className="hh-spec mt-1.5 flex flex-wrap items-baseline gap-x-1 font-semibold leading-tight tracking-[-0.01em]">
                      <span className="whitespace-nowrap">{s.value}</span>
                      {s.unit && <span className="text-[0.875rem] font-medium text-white/75">{s.unit}</span>}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="fade-up flex flex-wrap items-center gap-x-8 gap-y-4" style={delay(0.84)}>
                <ButtonLink href="/products" variant="inverse" size="lg">
                  {home.hero.primaryCta} <ArrowRight size={18} />
                </ButtonLink>
                <TrackedLink
                  href="/request-a-quote"
                  event="quote_start"
                  params={{ location: "home_hero" }}
                  className="group inline-flex items-center gap-2.5 text-[1.125rem] font-medium tracking-[-0.02rem] text-white"
                >
                  <span className="u-link">{home.hero.secondaryCta}</span>
                  <ArrowRight size={18} className="transition-transform duration-500 ease-[var(--ease-expo)] group-hover:translate-x-1" />
                </TrackedLink>
              </div>
            </div>
          </div>
        </section>
      </ShowcaseProvider>

      {/* ============================ Proof ============================ */}
      <section className="section">
        <div className="padding-global py-10">
          <dl className="grid grid-cols-2 lg:grid-cols-4" data-grid-draw="cells fade">
            {proof.map((p) => (
              <div key={p.label} className="-ml-px -mt-px flex min-h-[11rem] flex-col items-center justify-center border border-line px-4 py-8 text-center">
                <dt className="sr-only">{p.label}</dt>
                <dd>
                  <span
                    className={`block whitespace-nowrap font-bold leading-none tabular-nums tracking-[-0.06em] text-ink ${"count" in p ? "text-[clamp(1.6rem,4vw,3.25rem)]" : "text-[clamp(1.2rem,2.5vw,2.25rem)]"}`}
                    {...("count" in p ? { "data-count": p.count, "data-from": p.from, "data-suffix": p.suffix } : {})}
                  >
                    {"count" in p ? `${p.count}${p.suffix}` : p.text}
                  </span>
                  <span className="mt-3 block font-mono text-[0.8125rem] font-medium uppercase leading-snug text-accent">{p.label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ============================ Categories ============================ */}
      <Section label={home.range.label} rule={false}>
        <h2 className="h2 max-w-[48rem]" data-split>
          {home.range.title}
        </h2>
        <div className="content-wrapper">
          <ul className="start-grid" data-rise>
            {categories.map((c, i) => (
              <li key={c.slug} className="grid-item">
                <Link href={`/products/${c.slug}`} className="group block">
                  <div className="media-frame product-tile relative aspect-[4/3]">
                    {c.image_path && (
                      <Image
                        src={mediaUrl(c.image_path)!}
                        alt=""
                        fill
                        sizes="(min-width: 992px) 26vw, 45vw"
                        className="media-zoom object-contain p-[12%]"
                      />
                    )}
                  </div>
                  <div className="mt-5 flex items-baseline justify-between gap-4">
                    <h3 className="text-[1.375rem] font-medium leading-tight tracking-[-0.03em]">
                      <span className="u-link">{c.name}</span>
                    </h3>
                    <span className="font-mono text-[0.8125rem] font-medium text-accent">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <p className="text-body mt-2 text-muted max-[479px]:hidden">{c.description}</p>
                </Link>
              </li>
            ))}
          </ul>
          <div className="content-aside">
            <div className="fixed-element">
              <p className="lead" data-reveal>
                {home.range.lead}
              </p>
              <Link href="/products" className="large-link">
                <LargeLinkLabel>{home.range.linkLabel}</LargeLinkLabel>
              </Link>
            </div>
          </div>
        </div>
      </Section>

      {/* ============================ Marquee ============================ */}
      <Marquee items={home.marquee.items} />

      {/* ============================ Applications ============================ */}
      <section className="section" aria-labelledby="h-applications">
        <div className="padding-global">
          <div className="section-rule flex flex-col items-center gap-24 max-[479px]:gap-14">
            <SectionTop label={home.industries.label} className="justify-center" />
            <div className="flex flex-col items-center gap-6 text-center">
              <h2 id="h-applications" className="h2 max-w-[48rem]" data-split>
                {home.industries.title}
              </h2>
              <p className="lead max-w-[32rem] text-muted" data-reveal>
                {home.industries.lead}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-14 pb-24 max-[767px]:pb-16">
          <ApplicationSlider
            rows={applications.map((a) => ({ slug: a.slug, name: a.name, summary: a.summary, image: mediaUrl(a.image_path) }))}
          />
        </div>
      </section>

      {/* ============================ Quality + Export ============================ */}
      <QualityExport regions={site.lists.exportRegions} quality={home.quality} exportBand={home.export} />

      {/* ============================ How to order ============================ */}
      <Section label={home.order.label}>
        <h2 className="h2 max-w-[48rem]" data-split>
          {home.order.title}
        </h2>
        <div className="mt-16">
          <OrderSteps steps={home.order.steps.map((x) => ({ t: x.title, b: x.body }))} />
        </div>
      </Section>
    </>
  );
}
