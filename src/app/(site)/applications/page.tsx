import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { listApplications } from "@/lib/data/catalogue";
import { mediaUrl } from "@/lib/env";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/ui/primitives";
import { Section } from "@/components/ui/system";
import { ArrowRight } from "@/components/ui/icons";

export const metadata: Metadata = pageMetadata({
  title: "Applications & Industries",
  description:
    "Diesel engines, pumping sets, generating sets and machinery for agriculture, irrigation, power generation, construction and food processing.",
  path: "/applications",
});

export default async function ApplicationsPage() {
  const applications = await listApplications();
  return (
    <>
      <PageHero
        eyebrow="Applications & industries"
        title="Matched to the work it will do."
        lead="Start from your application and we'll point you to the engines, sets and machines built for it."
        crumbs={[{ label: "Applications", href: "/applications" }]}
      />
      <Section rule={false} gap="sm">
        <ul className="product-grid" data-rise>
          {applications.map((a, i) => (
            <li key={a.slug} className="group relative flex h-full flex-col border-t border-line pt-5">
              <div className="media-frame product-tile relative aspect-[4/3] w-full">
                {a.image_path && (
                  <Image
                    src={mediaUrl(a.image_path)!}
                    alt=""
                    fill
                    sizes="(min-width: 1200px) 30vw, (min-width: 640px) 45vw, 100vw"
                    className="media-zoom object-contain p-[10%]"
                  />
                )}
              </div>
              <span className="mt-6 font-mono text-[0.8125rem] font-medium text-accent">{String(i + 1).padStart(2, "0")}</span>
              <h2 className="mt-2 text-[1.75rem] font-medium leading-[1.15] tracking-[-0.04em] max-[767px]:text-[1.5rem]">
                <Link href={`/applications/${a.slug}`} className="u-link after:absolute after:inset-0 after:content-['']">
                  {a.name}
                </Link>
              </h2>
              <p className="text-body mt-3 text-muted">{a.summary}</p>
              <span className="mt-auto inline-flex items-center gap-2 pt-6 text-[1rem] font-medium text-accent">
                Products for {a.name.toLowerCase()}
                <ArrowRight size={16} className="transition-transform duration-500 ease-[var(--ease-expo)] group-hover:translate-x-1" />
              </span>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
