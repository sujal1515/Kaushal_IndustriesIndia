import Image from "next/image";
import type { Metadata } from "next";
import { capabilities, exportRegions, groupCompanies, leadership, timeline } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { PageHero, SectionHeader } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { Section } from "@/components/ui/system";
import { ArrowRight } from "@/components/ui/icons";

export const metadata: Metadata = pageMetadata({
  title: "About Kaushal Industries — Manufacturer & Exporter Since 1964",
  description:
    "Kaushal Group set up its first manufacturing unit in Agra in 1964. Today Kaushal Industries and Kaushal Castings manufacture engines, pumping sets, generating sets and castings for 60+ countries.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About Kaushal Industries"
        title="Power for agriculture, built in Agra since 1964."
        lead="India needed power, fast — specifically for agriculture and irrigation. Kaushal Group was founded to build it, and has been manufacturing diesel engines and allied products ever since."
        crumbs={[{ label: "About", href: "/about" }]}
      />

      {/* Introduction — staggered image grid + sticky text */}
      <Section label="Introduction" rule={false} gap="none">
        <div className="content-wrapper mt-16">
          <ul className="start-grid" aria-label="Kaushal products" data-rise>
            {[
              { src: "/images/products/slow-speed-water-cooled.png", alt: "Slow speed water cooled diesel engine" },
              { src: "/images/products/centrifugal-water-pump.png", alt: "Centrifugal water pump" },
              { src: "/images/products/air-cooled-generating-set.png", alt: "Air cooled generating set" },
              { src: "/images/products/castings-foundry.png", alt: "Molten iron being poured at the Kaushal foundry", cover: true },
            ].map((img) => (
              <li key={img.src} className="grid-item">
                <div className="media-frame product-tile relative h-[24rem] max-[991px]:h-[22rem] max-[479px]:h-[14rem]">
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    sizes="(min-width: 992px) 26vw, 45vw"
                    className={img.cover ? "media-zoom object-cover !mix-blend-normal" : "media-zoom object-contain p-[12%]"}
                  />
                </div>
              </li>
            ))}
          </ul>
          <div className="content-aside">
            <div className="fixed-element gap-6">
              <p className="text-regular">
                Movement is an essential ingredient of progress — even more so for independent India, a vast sub-continent
                that needed power for its farms. The founders of Kaushal Group chose to manufacture for the core of
                India&apos;s agricultural development.
              </p>
              <p className="text-regular">
                Our units manufacture diesel engines, diesel pumping sets, diesel generating sets, centrifugal pumps and
                castings. Once the products found acceptance in domestic markets, we took them to international markets —
                today buyers in more than 60 countries.
              </p>
              <p className="text-regular">
                Technology, training, automation and management systems are upgraded continuously to keep pace with
                developments in our field.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Timeline */}
      <Section label="History">
        <h2 className="h2 max-w-[48rem]" data-split>
          Six decades of movement.
        </h2>
        <ol className="mt-16 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4" data-rise>
          {timeline.map((t) => (
            <li key={t.title} className="grid-item">
              <p className="h2 text-accent">{t.year}</p>
              <h3 className="mt-8 text-regular">{t.title}</h3>
              <p className="mt-3 text-[1.0625rem] font-medium leading-relaxed text-muted">{t.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Capability */}
      <Section label="Manufacturing capability">
        <SectionHeader
          title="Engine, pump, alternator coupling and foundry under one group."
          lead="From pattern to finished, tested product — the work stays in-house."
        />
        <ul className="mt-20 grid gap-x-6 gap-y-16 sm:grid-cols-2 lg:grid-cols-3" data-rise>
          {capabilities.map((c, i) => (
            <li key={c.title} className="grid-item">
              <span className="font-mono text-[0.875rem] font-medium text-accent">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="h3 mt-8">{c.title}</h3>
              <p className="mt-4 text-[1.0625rem] font-medium leading-relaxed text-muted">{c.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* Group — brand band */}
      <section className="relative z-[1] overflow-clip bg-ink text-white">
        <div className="padding-global">
          <div className="py-32 max-[479px]:py-20">
            <p className="eyebrow !text-white/75">Kaushal Group</p>
            <h2 className="h2 mt-6 max-w-[48rem]" data-split>
              A composite group of manufacturers and exporters.
            </h2>
            <ul className="mt-20 grid gap-x-6 gap-y-12 md:grid-cols-3" data-rise>
              {groupCompanies.map((g) => (
                <li key={g.name} className="border-t border-white/25 pt-6">
                  <h3 className="h3">{g.name}</h3>
                  <p className="mt-3 font-mono text-[0.875rem] font-medium uppercase text-white/75">{g.location}</p>
                  <p className="mt-8 text-[1.0625rem] font-medium leading-relaxed text-white/85">{g.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Export experience + team */}
      <Section rule={false} gap="sm">
        <div className="grid gap-24 lg:grid-cols-2">
          <div className="flex flex-col items-start">
            <p className="eyebrow">Export experience</p>
            <h2 className="h2 mt-6" data-split>
              Buyers on six continents.
            </h2>
            <p className="text-regular mt-8 max-w-[36rem]">
              We supply importers, distributors, wholesalers and government and semi-government organisations — including
              bodies of the UN — as well as leading export houses in New Delhi and Mumbai.
            </p>
            <ul className="mt-10 flex flex-wrap gap-2">
              {exportRegions.map((r) => (
                <li key={r} className="rounded-[0.25rem] border border-line-strong px-2.5 py-1 font-mono text-[0.8rem] font-medium uppercase text-ink-soft">
                  {r}
                </li>
              ))}
            </ul>
            <ButtonLink href="/export-markets" variant="secondary" className="mt-12">
              Export capability <ArrowRight size={16} />
            </ButtonLink>
          </div>
          <div className="flex flex-col items-start">
            <p className="eyebrow">Our team</p>
            <h2 className="h2 mt-6" data-split>
              People are the most important asset.
            </h2>
            <p className="text-regular mt-8 max-w-[36rem]">
              Our management brings deep experience across production, finance, marketing and general management. We have
              built a qualified, dynamic team that strives for perfection in every field of operation.
            </p>
            <blockquote className="h3 mt-12 border-l-2 border-accent pl-8">
              “Movement is progress, and for us it has been the reason and the result.”
            </blockquote>
          </div>
        </div>
      </Section>

      {leadership.length > 0 && (
        <Section label="Leadership">
          <h2 className="h2 max-w-[48rem]" data-split>
            The people behind Kaushal.
          </h2>
          <ul className="mt-16 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {leadership.map((l) => (
              <li key={l.name} className="grid-item">
                <h3 className="h3">{l.name}</h3>
                <p className="mt-2 font-mono text-[0.875rem] font-medium uppercase text-accent">{l.role}</p>
                {l.bio && <p className="mt-4 text-[1.0625rem] font-medium leading-relaxed text-muted">{l.bio}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
