import type { Metadata } from "next";
import { listResources } from "@/lib/data/catalogue";
import { qualityControls, qualityPolicy, warranty } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { PageHero, SectionHeader } from "@/components/ui/primitives";
import { Section } from "@/components/ui/system";
import { Check, Shield } from "@/components/ui/icons";
import { CertificateGrid } from "@/components/site/certificate-grid";

export const metadata: Metadata = pageMetadata({
  title: "Quality, Certifications & Awards",
  description:
    "Kaushal Industries' quality policy, in-house quality controls, ISO 9001:2015 quality management system, current certificates, export awards and warranty.",
  path: "/quality-certifications",
});

export default async function QualityPage() {
  const resources = await listResources();
  const certificates = resources.filter((r) => r.type === "certificate");
  const awards = resources.filter((r) => r.type === "award");

  return (
    <>
      <PageHero
        eyebrow="Quality & certifications"
        title="Right first time, every time."
        lead={qualityPolicy.statement}
        crumbs={[{ label: "Quality & certifications", href: "/quality-certifications" }]}
      />

      {/* Policy */}
      <Section label="Quality policy" rule={false}>
        <div className="grid gap-16 lg:grid-cols-[2fr_3fr] lg:gap-24">
          <h2 className="h2" data-split>
            Our working philosophy.
          </h2>
          <div className="grid gap-16">
            <ol className="border-b border-line" data-stagger="0.08" data-grid-draw>
              {qualityPolicy.philosophy.map((p, i) => (
                <li key={p} className="flex gap-8 border-t border-line py-6">
                  <span className="font-mono text-[0.875rem] font-medium leading-8 text-accent">0{i + 1}</span>
                  <span className="text-regular">{p}</span>
                </li>
              ))}
            </ol>
            <div>
              <h3 className="eyebrow">Quality objectives</h3>
              <ul className="mt-6 flex flex-wrap gap-3">
                {qualityPolicy.objectives.map((o) => (
                  <li key={o} className="inline-flex items-center gap-2.5 rounded-[0.25rem] bg-accent-soft px-4 py-3 text-[1.125rem] font-medium text-accent-strong">
                    <Check size={18} /> {o}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* Controls */}
      <Section label="Testing & quality controls">
        <h2 className="h2 max-w-[48rem]" data-split>
          Controlled from casting to finished engine.
        </h2>
        <ul className="mt-16 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4" data-rise>
          {qualityControls.map((q) => (
            <li key={q.title} className="grid-item">
              <h3 className="text-regular">{q.title}</h3>
              <p className="mt-4 text-[1.0625rem] font-medium leading-relaxed text-muted">{q.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* ISO + warranty — brand band */}
      <section className="relative z-[1] overflow-clip bg-ink text-white">
        <div
          aria-hidden
          data-parallax="trigger"
          data-parallax-start="-20"
          data-parallax-end="20"
          data-parallax-scroll-start="top top"
          className="absolute inset-x-0 top-0 h-[120%] opacity-[0.12] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:4rem_4rem]"
        />
        <div className="padding-global relative">
          <div className="flex min-h-[100svh] flex-col justify-between gap-24 py-32 max-[479px]:py-20">
            <div className="max-w-[64rem]">
              <Shield size={30} className="text-sky" />
              <p className="eyebrow mt-10 !text-white/75">Certification</p>
              <p className="h3 mt-4" data-split>
                Quality management system — ISO 9001:2015.
              </p>
            </div>
            <div id="warranty" className="flex max-w-[48rem] scroll-mt-8 flex-col gap-5 border-b border-white/25 pb-6">
              <p className="eyebrow !text-white/75">Warranty</p>
              <p className="h3">{warranty.headline}</p>
              <p className="text-regular text-white/85">{warranty.body}</p>
            </div>
          </div>
        </div>
      </section>

      {certificates.length > 0 && (
        <Section id="certificates" label="Downloadable evidence" rule={false}>
          <SectionHeader title="Certificates & registrations." lead="Open any certificate to view or save the full-size document." />
          <div className="mt-16">
            <CertificateGrid items={certificates} />
          </div>
        </Section>
      )}

      {awards.length > 0 && (
        <Section id="awards" label="Recognition">
          <SectionHeader title="Export awards." lead="Awarded by EEPC India for export performance." />
          <div className="mt-16">
            <CertificateGrid items={awards} />
          </div>
        </Section>
      )}
    </>
  );
}
