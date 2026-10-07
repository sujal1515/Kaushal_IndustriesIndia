import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, getSettings, listProducts } from "@/lib/data/catalogue";
import { mediaUrl, STORAGE_BUCKETS } from "@/lib/env";
import { pageMetadata, productJsonLd } from "@/lib/seo";
import { whatsappHref } from "@/lib/site";
import { fileExtension, formatBytes } from "@/lib/utils";
import { buttonClass } from "@/components/ui/button";
import { Badge, DefinitionGrid, JsonLd, PageHero, Prose, SectionHeader, StatusBadge } from "@/components/ui/primitives";
import { Section } from "@/components/ui/system";
import { ArrowRight, Check, Download, Plus, WhatsApp } from "@/components/ui/icons";
import { ProductGallery } from "@/components/catalogue/gallery";
import { SpecTables } from "@/components/catalogue/spec-table";
import { ProductCard } from "@/components/catalogue/product-card";
import { PrintButton } from "@/components/catalogue/print-button";
import { ProductActionBar } from "@/components/catalogue/product-action-bar";
import { TrackOnMount, TrackedAnchor, TrackedLink } from "@/components/site/tracked";

export async function generateStaticParams() {
  return (await listProducts()).map((p) => ({ category: p.category_slug, product: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/products/[category]/[product]">): Promise<Metadata> {
  const { category, product } = await params;
  const p = await getProduct(category, product);
  if (!p) return {};
  const modelList = p.models.length ? ` Models: ${p.models.slice(0, 6).map((m) => m.model_code).join(", ")}${p.models.length > 6 ? "…" : ""}.` : "";
  return pageMetadata({
    title: p.seo_title ?? `${p.name} | ${p.category.name}`,
    description: p.seo_description ?? `${p.summary ?? p.name}${modelList}`.slice(0, 300),
    path: `/products/${p.category_slug}/${p.slug}`,
    image: p.primary_image?.storage_path,
  });
}

export default async function ProductPage({ params }: PageProps<"/products/[category]/[product]">) {
  const { category, product } = await params;
  const [p, settings] = await Promise.all([getProduct(category, product), getSettings()]);
  if (!p) notFound();

  const path = `/products/${p.category_slug}/${p.slug}`;
  const quoteHref = `/request-a-quote?product=${p.slug}&category=${p.category_slug}`;
  const images = p.images
    .map((i) => ({ src: mediaUrl(i.storage_path)!, alt: i.alt_text }))
    .filter((i) => i.src);
  const sections = [
    { id: "overview", label: "Overview", show: true },
    { id: "specifications", label: "Specifications", show: p.models.length > 0 || p.descriptive_specs.length > 0 },
    { id: "equipment", label: "Equipment & options", show: p.standard_equipment.length > 0 || p.optional_extras.length > 0 },
    { id: "downloads", label: "Downloads", show: p.resources.length > 0 },
    { id: "faqs", label: "FAQs", show: p.faqs.length > 0 },
  ].filter((s) => s.show);
  const isUnavailable = p.status === "coming_soon" || p.status === "discontinued";

  return (
    <article>
      <TrackOnMount event="view_item" params={{ product: p.slug, category: p.category_slug }} />
      <JsonLd data={productJsonLd(p, path)} />

      <PageHero
        crumbs={[
          { label: "Products", href: "/products" },
          { label: p.category.name, href: `/products/${p.category_slug}` },
          { label: p.name, href: path },
        ]}
        media={<ProductGallery images={images} name={p.name} />}
        eyebrow={
          <>
            <Link href={`/products/${p.category_slug}`} className="u-link transition-colors hover:text-accent">
              {p.category.name}
            </Link>
            <StatusBadge status={p.status} />
          </>
        }
        title={p.name}
      >
        <div className="flex flex-col gap-8">
          {(p.subtitle || p.summary) && (
            <div className="flex flex-col gap-3">
              {p.subtitle && <p className="text-[1.125rem] font-medium text-white/75">{p.subtitle}</p>}
              {p.summary && <p className="lead max-w-[30rem]">{p.summary}</p>}
            </div>
          )}
          {p.key_specs.length > 0 && <DefinitionGrid tone="inverse" items={p.key_specs} />}
          <div className="no-print flex flex-wrap gap-3">
            <TrackedLink
              href={quoteHref}
              event="quote_start"
              params={{ location: "product_page", product: p.slug, category: p.category_slug }}
              className={buttonClass("inverse", "lg")}
            >
              {isUnavailable ? "Register interest" : "Request a quote"} <ArrowRight size={18} />
            </TrackedLink>
            <TrackedAnchor
              href={whatsappHref(settings.whatsapp, `Hello Kaushal Industries, I'm interested in the ${p.name}.`)}
              target="_blank"
              rel="noopener noreferrer"
              event="contact_click"
              params={{ method: "whatsapp", location: "product_page", product: p.slug }}
              className={buttonClass("secondary", "lg", "border-white/40 text-white hover:border-white")}
            >
              <WhatsApp size={18} /> WhatsApp
            </TrackedAnchor>
          </div>
          {p.status === "discontinued" && (
            <p className="rounded-[0.25rem] bg-white/15 p-4 text-[1rem] font-medium text-white">
              This product is no longer in regular production. Contact us for spares or a current alternative.
            </p>
          )}
        </div>
      </PageHero>

      {/* In-page navigation — sticks under the header, with the quote action always at hand */}
      {sections.length > 1 && (
        <nav
          aria-label="On this page"
          className="section no-print sticky top-[var(--header-offset)] z-30 border-b border-line bg-paper/95 backdrop-blur-md transition-[top] duration-500 ease-[var(--ease-expo)]"
        >
          <div className="padding-global flex items-center gap-6">
            <ul className="flex min-w-0 flex-1 items-center gap-7 overflow-x-auto py-4 [scrollbar-width:none]">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="u-link whitespace-nowrap font-mono text-[0.8125rem] font-medium uppercase text-ink">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="hidden lg:block">
              <PrintButton />
            </div>
            <span className="hidden md:contents">
              <TrackedLink
                href={quoteHref}
                event="quote_start"
                params={{ location: "product_sticky_bar", product: p.slug, category: p.category_slug }}
                className={buttonClass("primary", "sm")}
              >
                {isUnavailable ? "Register interest" : "Request a quote"}
              </TrackedLink>
            </span>
          </div>
        </nav>
      )}
      <ProductActionBar
        quoteHref={quoteHref}
        quoteLabel={isUnavailable ? "Register interest" : "Request a quote"}
        whatsappHref={whatsappHref(settings.whatsapp, `Hello Kaushal Industries, I'm interested in the ${p.name}.`)}
        product={p.slug}
        category={p.category_slug}
      />

      {/* Overview */}
      <Section id="overview" rule={false} gap="sm" labelledBy="h-overview">
        <div className="grid gap-12 lg:grid-cols-[2fr_3fr] lg:gap-24">
          <h2 id="h-overview" className="h2" data-split>
            Overview
          </h2>
          <div>
            <Prose text={p.description_md} className="text-body max-w-[48rem] !text-[1.25rem]" />
            {p.applications.length > 0 && (
              <div className="mt-16">
                <h3 className="eyebrow">Applications</h3>
                <ul className="mt-6 border-b border-line" data-grid-draw>
                  {p.applications.map((a) => (
                    <li key={a.slug} className="border-t border-line">
                      <Link href={`/applications/${a.slug}`} className="group flex items-center justify-between gap-6 py-4 text-[1.25rem] font-medium">
                        <span className="u-link">{a.name}</span>
                        <ArrowRight size={18} className="text-accent transition-transform duration-500 ease-[var(--ease-expo)] group-hover:translate-x-1" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* Specifications */}
      {(p.models.length > 0 || p.descriptive_specs.length > 0) && (
        <Section id="specifications" gap="sm" labelledBy="h-specs">
          <SectionHeader id="h-specs" title="Technical specification" lead={p.notes.length > 0 ? p.notes[p.notes.length - 1] : undefined} className="mb-16" />
          {p.models.length > 0 && (
            <SpecTables
              productName={p.name}
              productSlug={p.slug}
              categorySlug={p.category_slug}
              attributes={p.attributes}
              models={p.models}
            />
          )}
          {p.descriptive_specs.length > 0 && (
            <div className="mt-24 grid gap-10 lg:grid-cols-[2fr_3fr] lg:gap-24">
              <h3 className="h3">Construction</h3>
              <dl className="border-b border-line" data-grid-draw>
                {p.descriptive_specs.map((d) => (
                  <div key={d.label} className="grid gap-1 border-t border-line py-5 sm:grid-cols-3 sm:gap-6">
                    <dt className="font-mono text-[0.875rem] font-medium uppercase leading-snug text-accent sm:pt-1">{d.label}</dt>
                    <dd className="text-[1.125rem] font-medium leading-relaxed sm:col-span-2">{d.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {p.notes.length > 1 && (
            <ul className="mt-12 grid gap-2 text-[1rem] text-muted">
              {p.notes.slice(0, -1).map((note) => (
                <li key={note}>* {note}</li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {/* Equipment & options */}
      {(p.standard_equipment.length > 0 || p.optional_extras.length > 0) && (
        <Section id="equipment" gap="sm">
          <div className="grid gap-16 md:grid-cols-2 md:gap-24">
            {p.standard_equipment.length > 0 && (
              <div>
                <h2 className="h3" data-split>
                  Standard equipment
                </h2>
                <ul className="mt-10 border-b border-line" data-grid-draw>
                  {p.standard_equipment.map((e) => (
                    <li key={e} className="flex items-start gap-4 border-t border-line py-4 text-[1.125rem] font-medium">
                      <Check size={20} className="mt-0.5 shrink-0 text-accent" />
                      <span>{e}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {p.optional_extras.length > 0 && (
              <div>
                <h2 className="h3" data-split>
                  Options on request
                </h2>
                <ul className="mt-10 border-b border-line" data-grid-draw>
                  {p.optional_extras.map((e) => (
                    <li key={e} className="flex items-start gap-4 border-t border-line py-4 text-[1.125rem] font-medium text-ink-soft">
                      <Plus size={20} className="mt-0.5 shrink-0 text-muted" />
                      <span>{e}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Downloads */}
      {p.resources.length > 0 && (
        <Section id="downloads" gap="sm">
          <h2 className="h2" data-split>
            Downloads
          </h2>
          <ul className="mt-12 grid border-b border-line md:grid-cols-2 md:gap-x-12" data-grid-draw>
            {p.resources.map((r) => (
              <li key={r.id} className="border-t border-line">
                <TrackedAnchor
                  href={mediaUrl(r.storage_path, STORAGE_BUCKETS.documents) ?? "#"}
                  target="_blank"
                  rel="noopener"
                  event="file_download"
                  params={{ file_name: r.title, resource_type: r.type, product: p.slug }}
                  className="group flex items-center justify-between gap-4 py-5"
                >
                  <span>
                    <span className="u-link block text-[1.25rem] font-medium">{r.title}</span>
                    <span className="mt-1 block font-mono text-[0.875rem] uppercase text-muted">
                      {fileExtension(r.storage_path)}
                      {formatBytes(r.file_size) && ` · ${formatBytes(r.file_size)}`}
                    </span>
                  </span>
                  <Download className="text-accent" />
                </TrackedAnchor>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* FAQs */}
      {p.faqs.length > 0 && (
        <Section id="faqs" gap="sm">
          <div className="grid gap-12 lg:grid-cols-[2fr_3fr] lg:gap-24">
            <h2 className="h2" data-split>
              Questions buyers ask
            </h2>
            <div className="border-b border-line" data-grid-draw>
              {p.faqs.map((f) => (
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
        </Section>
      )}

      {/* Related */}
      {p.related.length > 0 && (
        <Section gap="sm" className="no-print">
          <div className="flex items-end justify-between gap-6">
            <h2 className="h2" data-split>
              Related products
            </h2>
            <Badge>{p.category.name}</Badge>
          </div>
          <div className="product-grid mt-16" data-rise>
            {p.related.map((r) => (
              <ProductCard key={r.id} product={r} />
            ))}
          </div>
        </Section>
      )}

      {/* Closing RFQ — brand band */}
      <section className="no-print relative z-[1] overflow-clip bg-ink text-white">
        <div className="padding-global">
          <div className="flex flex-col gap-12 py-32 md:flex-row md:items-end md:justify-between max-[479px]:py-20">
            <div className="max-w-[48rem]">
              <p className="eyebrow !text-white/75">Request for quotation</p>
              <p className="h3 mt-6" data-split>
                Need a price for the {p.name.toLowerCase()}?
              </p>
              <p className="lead mt-6 text-white/80">The product is pre-filled — add your quantity, destination and timeline.</p>
            </div>
            <TrackedLink
              href={quoteHref}
              event="quote_start"
              params={{ location: "product_footer", product: p.slug, category: p.category_slug }}
              className={buttonClass("inverse", "lg", "self-start md:self-auto")}
            >
              Request a quote <ArrowRight size={18} />
            </TrackedLink>
          </div>
        </div>
      </section>
    </article>
  );
}
