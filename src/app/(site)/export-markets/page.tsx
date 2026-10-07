import Link from "next/link";
import type { Metadata } from "next";
import { buyerTypes, exportRegions } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/ui/primitives";
import { Section } from "@/components/ui/system";
import { ArrowRight, Box, FileText, Globe, Ship } from "@/components/ui/icons";
import { TrackedLink } from "@/components/site/tracked";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = pageMetadata({
  title: "Export Markets — Engines, Pumps & Gensets Supplied to 60+ Countries",
  description:
    "Kaushal Industries exports diesel engines, pumping sets, generating sets and castings to the Middle East, Africa, Asia, Australia, Europe and the Americas. Distributor enquiries welcome.",
  path: "/export-markets",
});

export default function ExportPage() {
  return (
    <>
      <PageHero
        eyebrow="Export markets"
        title="From Agra to more than 60 countries."
        lead="We supply importers, distributors and government buyers worldwide — and the export houses of New Delhi and Mumbai."
        crumbs={[{ label: "Export markets", href: "/export-markets" }]}
      />

      {/* Regions — bordered wall of cells */}
      <Section label="Regions served" rule={false}>
        <h2 className="h2 max-w-[48rem]" data-split>
          Six continents, one specification.
        </h2>
        <ul className="mt-16 grid grid-cols-2 lg:grid-cols-4" data-grid-draw="cells fade">
          {exportRegions.map((r, i) => (
            <li key={r} className="-ml-px -mt-px flex aspect-[3/2] flex-col justify-between border border-line p-6 max-[479px]:p-4">
              <span className="font-mono text-[0.875rem] font-medium text-accent">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-[clamp(1.125rem,2vw,1.75rem)] font-medium leading-tight tracking-[-0.03em]">{r}</span>
            </li>
          ))}
          <li className="-ml-px -mt-px flex aspect-[3/2] flex-col justify-between border border-ink bg-ink p-6 text-white max-[479px]:p-4">
            <Globe size={24} className="text-sky" />
            <span className="text-[clamp(1.125rem,2vw,1.75rem)] font-medium leading-tight tracking-[-0.03em]">60+ countries</span>
          </li>
        </ul>
      </Section>

      {/* Capabilities */}
      <Section gap="sm">
        <div className="grid gap-x-6 gap-y-16 lg:grid-cols-3" data-rise>
          <div className="grid-item">
            <Box size={28} className="text-accent" />
            <h2 className="h3 mt-8">Packing for export</h2>
            <p className="mt-4 text-[1.0625rem] font-medium leading-relaxed text-muted">
              Every engine model is published with its approximate packed case size and gross weight, so you can plan
              container loads and freight before you ask for a quotation.
            </p>
            <Link href="/products/diesel-engines#model-finder" className="group mt-6 inline-flex items-center gap-2 text-[1.125rem] font-medium text-accent">
              <span className="u-link">See case sizes by model</span> <ArrowRight size={18} />
            </Link>
          </div>
          <div className="grid-item">
            <FileText size={28} className="text-accent" />
            <h2 className="h3 mt-8">Documentation</h2>
            <p className="mt-4 text-[1.0625rem] font-medium leading-relaxed text-muted">
              Tell us your destination country and import requirements in your enquiry; we confirm the export documents
              we will provide with your quotation.
            </p>
          </div>
          <div className="grid-item">
            <Ship size={28} className="text-accent" />
            <h2 className="h3 mt-8">Logistics</h2>
            <p className="mt-4 text-[1.0625rem] font-medium leading-relaxed text-muted">
              Share your destination port or city and required timeline. We quote lead time and shipping options for your
              order.
            </p>
          </div>
        </div>
      </Section>

      {/* Buyers + distributors */}
      <Section gap="sm">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-24">
          <div>
            <p className="eyebrow">Who we supply</p>
            <h2 className="h2 mt-6" data-split>
              Trusted by trade and government buyers.
            </h2>
            <ul className="mt-12 border-b border-line" data-stagger="0.08" data-grid-draw>
              {buyerTypes.map((b) => (
                <li key={b} className="text-regular border-t border-line py-5">
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div id="distributors" className="flex scroll-mt-8 flex-col justify-between bg-ink p-12 text-white max-[767px]:p-8">
            <div>
              <p className="eyebrow !text-white/75">Distributor enquiries</p>
              <p className="h3 mt-6">Represent Kaushal engines and pumps in your market.</p>
              <p className="text-regular mt-6 text-white/85">
                Tell us about your company, territory and the product lines you are interested in.
              </p>
            </div>
            <TrackedLink
              href="/request-a-quote?type=distributor"
              event="quote_start"
              params={{ location: "export_distributor" }}
              className={buttonClass("inverse", "lg", "mt-16 self-start")}
            >
              Become a distributor <ArrowRight size={18} />
            </TrackedLink>
          </div>
        </div>
      </Section>
    </>
  );
}
