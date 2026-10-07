import Link from "next/link";
import type { Metadata } from "next";
import { listFaqs, listResources } from "@/lib/data/catalogue";
import { mediaUrl, STORAGE_BUCKETS } from "@/lib/env";
import { pageMetadata } from "@/lib/seo";
import { fileExtension, formatBytes } from "@/lib/utils";
import type { ResourceType } from "@/lib/types";
import { JsonLd, PageHero, Prose } from "@/components/ui/primitives";
import { LargeLinkLabel, Section } from "@/components/ui/system";
import { Download, Plus } from "@/components/ui/icons";
import { CertificateGrid } from "@/components/site/certificate-grid";
import { TrackedAnchor } from "@/components/site/tracked";

export const metadata: Metadata = pageMetadata({
  title: "Resources — Brochures, Data Sheets, Certificates & FAQs",
  description:
    "Download Kaushal Industries brochures, technical data sheets and certificates, and find answers to common questions about our engines, generating sets and pumps.",
  path: "/resources",
});

const documentTypes: { type: ResourceType; label: string }[] = [
  { type: "brochure", label: "Brochures" },
  { type: "datasheet", label: "Technical data sheets" },
  { type: "manual", label: "Manuals" },
  { type: "maintenance_guide", label: "Maintenance guidance" },
  { type: "other", label: "Other documents" },
];

export default async function ResourcesPage() {
  const [resources, faqs] = await Promise.all([listResources(), listFaqs()]);
  const docGroups = documentTypes
    .map((g) => ({ ...g, items: resources.filter((r) => r.type === g.type) }))
    .filter((g) => g.items.length > 0);
  const evidence = resources.filter((r) => r.type === "certificate" || r.type === "award");

  return (
    <>
      <PageHero
        eyebrow="Resources"
        title="Documents and answers."
        lead="Brochures, data sheets, certificates and the questions buyers ask most often."
        crumbs={[{ label: "Resources", href: "/resources" }]}
      >
        <nav aria-label="Resource sections">
          <ul className="border-b border-white/25">
            {[...docGroups.map((g) => ({ id: g.type, label: g.label })), { id: "certificates", label: "Certificates & awards" }, { id: "faqs", label: "FAQs" }].map((s) => (
              <li key={s.id} className="border-t border-white/25">
                <a href={`#${s.id}`} className="group flex py-3 text-[1.125rem] font-medium">
                  <span className="u-link">{s.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </PageHero>

      {docGroups.length === 0 && (
        <Section rule={false} gap="sm">
          <div className="grid gap-10 lg:grid-cols-[3fr_2fr] lg:items-end lg:gap-24">
            <div className="max-w-[48rem]">
              <h2 className="h3">Need a brochure or data sheet?</h2>
              <p className="text-regular mt-6 text-muted">
                Full specifications for every published model are on each product page — print any page as a spec sheet.
                For a brochure, ask us and we&apos;ll email it.
              </p>
            </div>
            <Link href="/request-a-quote" className="large-link self-start lg:self-end">
              <LargeLinkLabel>Request documents</LargeLinkLabel>
            </Link>
          </div>
        </Section>
      )}

      {docGroups.map((g, i) => (
        <Section key={g.type} id={g.type} rule={i > 0} gap="sm">
          <h2 className="h2" data-split>
            {g.label}
          </h2>
          <ul className="mt-12 grid border-b border-line md:grid-cols-2 md:gap-x-12" data-grid-draw>
            {g.items.map((r) => (
              <li key={r.id} className="border-t border-line">
                <TrackedAnchor
                  href={mediaUrl(r.storage_path, STORAGE_BUCKETS.documents) ?? "#"}
                  target="_blank"
                  rel="noopener"
                  event="file_download"
                  params={{ file_name: r.title, resource_type: r.type }}
                  className="group flex items-center justify-between gap-4 py-5"
                >
                  <span>
                    <span className="u-link block text-[1.25rem] font-medium">{r.title}</span>
                    {r.description && <span className="mt-1 block text-[1rem] text-muted">{r.description}</span>}
                    <span className="mt-2 block font-mono text-[0.875rem] uppercase text-muted">
                      {fileExtension(r.storage_path)}
                      {formatBytes(r.file_size) && ` · ${formatBytes(r.file_size)}`}
                    </span>
                  </span>
                  <Download className="shrink-0 text-accent" />
                </TrackedAnchor>
              </li>
            ))}
          </ul>
        </Section>
      ))}

      {evidence.length > 0 && (
        <Section id="certificates" label="Evidence">
          <h2 className="h2 max-w-[48rem]" data-split>
            Certificates &amp; awards.
          </h2>
          <div className="mt-16">
            <CertificateGrid items={evidence} />
          </div>
        </Section>
      )}

      {faqs.length > 0 && (
        <Section id="faqs" label="FAQs">
          <div className="grid gap-12 lg:grid-cols-[2fr_3fr] lg:gap-24">
            <div>
              <h2 className="h2" data-split>
                Questions buyers ask.
              </h2>
              <p className="text-regular mt-8 text-muted">
                Can&apos;t find your answer?{" "}
                <Link href="/contact" className="u-link text-ink">
                  Contact us
                </Link>
                .
              </p>
            </div>
            <div className="border-b border-line" data-grid-draw="cells">
              {faqs.map((f) => (
                <details key={f.id} className="group border-t border-line py-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[1.25rem] font-medium tracking-[-0.02rem] [&::-webkit-details-marker]:hidden">
                    {f.question}
                    <Plus size={22} className="shrink-0 text-accent transition-transform duration-500 ease-[var(--ease-nav)] group-open:rotate-45" />
                  </summary>
                  <Prose text={f.answer_md} className="mt-4 max-w-[48rem] text-[1.125rem] font-medium leading-relaxed text-muted" />
                </details>
              ))}
            </div>
          </div>
          <JsonLd
            data={{
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faqs.map((f) => ({
                "@type": "Question",
                name: f.question,
                acceptedAnswer: { "@type": "Answer", text: f.answer_md },
              })),
            }}
          />
        </Section>
      )}
    </>
  );
}
