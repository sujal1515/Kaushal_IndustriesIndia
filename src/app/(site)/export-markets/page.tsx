import Link from "next/link";
import { cmsMetadata, getPageContent } from "@/lib/cms/content";
import { PageHero } from "@/components/ui/primitives";
import { Section } from "@/components/ui/system";
import { ArrowRight, Box, Factory, FileText, Globe, Shield, Ship } from "@/components/ui/icons";
import { TrackedLink } from "@/components/site/tracked";
import { buttonClass } from "@/components/ui/button";

export const generateMetadata = () => cmsMetadata("export-markets", "/export-markets");

const ICONS = { box: Box, file: FileText, ship: Ship, globe: Globe, shield: Shield, factory: Factory } as const;

export default async function ExportPage() {
  const [c, site] = await Promise.all([getPageContent("export-markets"), getPageContent("global")]);
  return (
    <>
      <PageHero eyebrow={c.hero.eyebrow} title={c.hero.title} lead={c.hero.lead} crumbs={[{ label: "Export markets", href: "/export-markets" }]} />

      {/* Regions — bordered wall of cells */}
      <Section label={c.regions.label} rule={false}>
        <h2 className="h2 max-w-[48rem]" data-split>
          {c.regions.title}
        </h2>
        <ul className="mt-16 grid grid-cols-2 lg:grid-cols-4" data-grid-draw="cells fade">
          {site.lists.exportRegions.map((r, i) => (
            <li key={`${r}-${i}`} className="-ml-px -mt-px flex aspect-[3/2] flex-col justify-between border border-line p-6 max-[479px]:p-4">
              <span className="font-mono text-[0.875rem] font-medium text-accent">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-[clamp(1.125rem,2vw,1.75rem)] font-medium leading-tight tracking-[-0.03em]">{r}</span>
            </li>
          ))}
          <li className="-ml-px -mt-px flex aspect-[3/2] flex-col justify-between border border-ink bg-ink p-6 text-white max-[479px]:p-4">
            <Globe size={24} className="text-sky" />
            <span className="text-[clamp(1.125rem,2vw,1.75rem)] font-medium leading-tight tracking-[-0.03em]">{c.regions.countries}</span>
          </li>
        </ul>
      </Section>

      {/* Capabilities */}
      <Section gap="sm">
        <div className="grid gap-x-6 gap-y-16 lg:grid-cols-3" data-rise>
          {c.capabilities.items.map((item, i) => {
            const Icon = ICONS[item.icon as keyof typeof ICONS] ?? Box;
            return (
              <div key={`${item.title}-${i}`} className="grid-item">
                <Icon size={28} className="text-accent" />
                <h2 className="h3 mt-8">{item.title}</h2>
                <p className="mt-4 text-[1.0625rem] font-medium leading-relaxed text-muted">{item.body}</p>
                {item.link.label && item.link.href && (
                  <Link href={item.link.href} className="group mt-6 inline-flex items-center gap-2 text-[1.125rem] font-medium text-accent">
                    <span className="u-link">{item.link.label}</span> <ArrowRight size={18} />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* Buyers + distributors */}
      <Section gap="sm">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-24">
          <div>
            <p className="eyebrow">{c.buyers.eyebrow}</p>
            <h2 className="h2 mt-6" data-split>
              {c.buyers.title}
            </h2>
            <ul className="mt-12 border-b border-line" data-stagger="0.08" data-grid-draw>
              {site.lists.buyerTypes.map((b, i) => (
                <li key={`${b}-${i}`} className="text-regular border-t border-line py-5">
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div id="distributors" className="flex scroll-mt-8 flex-col justify-between bg-ink p-12 text-white max-[767px]:p-8">
            <div>
              <p className="eyebrow !text-white/75">{c.distributors.eyebrow}</p>
              <p className="h3 mt-6">{c.distributors.title}</p>
              <p className="text-regular mt-6 text-white/85">{c.distributors.body}</p>
            </div>
            <TrackedLink
              href="/request-a-quote?type=distributor"
              event="quote_start"
              params={{ location: "export_distributor" }}
              className={buttonClass("inverse", "lg", "mt-16 self-start")}
            >
              {c.distributors.button} <ArrowRight size={18} />
            </TrackedLink>
          </div>
        </div>
      </Section>
    </>
  );
}
