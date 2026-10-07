import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getApplication, listApplications } from "@/lib/data/catalogue";
import { pageMetadata } from "@/lib/seo";
import { PageHero, Prose } from "@/components/ui/primitives";
import { LargeLinkLabel, Section } from "@/components/ui/system";
import { ArrowRight } from "@/components/ui/icons";
import { ProductCard } from "@/components/catalogue/product-card";
import { TrackedLink } from "@/components/site/tracked";

export async function generateStaticParams() {
  return (await listApplications()).map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps<"/applications/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const a = await getApplication(slug);
  if (!a) return {};
  return pageMetadata({
    title: a.seo_title ?? `${a.name} — Engines & Equipment`,
    description: a.seo_description ?? a.summary ?? a.name,
    path: `/applications/${a.slug}`,
    image: a.image_path,
  });
}

export default async function ApplicationPage({ params }: PageProps<"/applications/[slug]">) {
  const { slug } = await params;
  const [a, all] = await Promise.all([getApplication(slug), listApplications()]);
  if (!a) notFound();
  const others = all.filter((x) => x.slug !== a.slug);

  return (
    <>
      <PageHero
        eyebrow="Application"
        title={a.name}
        lead={a.summary}
        crumbs={[
          { label: "Applications", href: "/applications" },
          { label: a.name, href: `/applications/${a.slug}` },
        ]}
      />

      {/* Body + sticky enquiry ("about" split) */}
      <Section rule={false} gap="sm">
        <div className="content-wrapper !mt-0">
          <Prose text={a.body_md} className="text-regular max-w-[48rem]" />
          <aside className="content-aside">
            <div className="fixed-element">
              <p className="text-regular">Have a specific installation in mind?</p>
              <p className="-mt-8 text-[1.125rem] font-medium leading-relaxed text-muted">
                Describe the machine you need to power and the duty cycle — we&apos;ll recommend an engine or set.
              </p>
              <TrackedLink
                href={`/request-a-quote?application=${a.slug}`}
                event="quote_start"
                params={{ location: "application_page", application: a.slug }}
                className="large-link"
              >
                <LargeLinkLabel>Request a quote</LargeLinkLabel>
              </TrackedLink>
            </div>
          </aside>
        </div>
      </Section>

      {a.products.length > 0 && (
        <Section gap="sm">
          <h2 className="h2 max-w-[48rem]" data-split>
            Products for {a.name.toLowerCase()}
          </h2>
          <div className="product-grid mt-16" data-rise>
            {a.products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </Section>
      )}

      <Section gap="none" end="sm">
        <div className="grid gap-10 pt-16 lg:grid-cols-[2fr_3fr] lg:gap-24">
          <h2 className="eyebrow">Other applications</h2>
          <ul className="border-b border-line" data-grid-draw>
            {others.map((o) => (
              <li key={o.slug} className="border-t border-line">
                <Link href={`/applications/${o.slug}`} className="group flex items-center justify-between gap-6 py-5">
                  <span className="h3">
                    <span className="u-link">{o.name}</span>
                  </span>
                  <ArrowRight size={22} className="shrink-0 text-accent transition-transform duration-500 ease-[var(--ease-expo)] group-hover:translate-x-1" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Section>
    </>
  );
}
