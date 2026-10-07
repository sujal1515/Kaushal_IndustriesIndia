import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategory, listCategories, listCategoryModels, listPowerFamilies, listProducts } from "@/lib/data/catalogue";
import { pageMetadata } from "@/lib/seo";
import { PageHero, SectionHeader } from "@/components/ui/primitives";
import { Section } from "@/components/ui/system";
import { ProductCard } from "@/components/catalogue/product-card";
import { ModelFinder, hasActiveFilters, type FinderParams } from "@/components/catalogue/model-finder";
import { PowerRange } from "@/components/catalogue/power-range";
import { ButtonLink } from "@/components/ui/button";

export async function generateStaticParams() {
  return (await listCategories()).map((c) => ({ category: c.slug }));
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/products/[category]">): Promise<Metadata> {
  const { category } = await params;
  const c = await getCategory(category);
  if (!c) return {};
  // Filtered views keep the base canonical and are not indexed (blueprint §4.4).
  const filtered = hasActiveFilters((await searchParams) as FinderParams);
  return pageMetadata({
    title: c.seo_title ?? c.name,
    description: c.seo_description ?? c.description ?? c.name,
    path: `/products/${c.slug}`,
    image: c.image_path,
    noindex: filtered,
  });
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/products/[category]">) {
  const { category } = await params;
  const c = await getCategory(category);
  if (!c) notFound();
  const [products, finder, sp, powerFamilies] = await Promise.all([
    listProducts({ categorySlug: c.slug }),
    listCategoryModels(c.slug),
    searchParams,
    listPowerFamilies(c.slug),
  ]);

  return (
    <>
      <PageHero
        eyebrow={`${products.length} product famil${products.length === 1 ? "y" : "ies"}`}
        title={c.name}
        lead={c.description}
        crumbs={[
          { label: "Products", href: "/products" },
          { label: c.name, href: `/products/${c.slug}` },
        ]}
      />

      <Section rule={false} gap="sm" end="sm" ariaLabel={`${c.name} products`}>
        {powerFamilies.length > 1 && (
          <div className="mb-20" data-reveal>
            <PowerRange families={powerFamilies} finderHref={`/products/${c.slug}`} />
          </div>
        )}
        <div className="product-grid" data-rise>
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} showCategory={false} priority={i < 2} />
          ))}
        </div>
        {products.length === 0 && (
          <div className="border-y border-line py-16 text-center">
            <p className="lead text-muted">Products in this category are being added. Tell us what you need.</p>
            <ButtonLink href="/request-a-quote" className="mt-8">
              Request a quote
            </ButtonLink>
          </div>
        )}
      </Section>

      {finder.rows.length > 1 && (
        <Section id="model-finder" label="Model finder">
          <SectionHeader
            title="Filter every model by what matters to you."
            lead="Narrow by cooling, speed class, configuration and rated power — then open the model in its family's full specification table."
            className="mb-16"
          />
          <ModelFinder rows={finder.rows} attributes={finder.attributes} params={sp as FinderParams} basePath={`/products/${c.slug}`} />
        </Section>
      )}
    </>
  );
}
