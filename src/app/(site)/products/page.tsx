import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { listCategories, listProducts } from "@/lib/data/catalogue";
import { mediaUrl } from "@/lib/env";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/ui/primitives";
import { LargeLinkLabel, Section } from "@/components/ui/system";
import { ProductCard } from "@/components/catalogue/product-card";

export const metadata: Metadata = pageMetadata({
  title: "Products — Diesel Engines, Generating Sets, Pumps & Castings",
  description:
    "Browse Kaushal Industries' full range: stationary diesel engines, diesel generating sets, centrifugal water pumps, agricultural machinery, castings and spare parts.",
  path: "/products",
});

export default async function ProductsPage() {
  const [categories, products] = await Promise.all([listCategories(), listProducts()]);
  return (
    <>
      <PageHero
        eyebrow="Products"
        title="The complete Kaushal range."
        lead="Six product lines, each manufactured and tested in-house. Choose a category to compare families and models."
        crumbs={[{ label: "Products", href: "/products" }]}
      >
        <nav aria-label="Product categories">
          <ul className="border-b border-white/25">
            {categories.map((c) => (
              <li key={c.slug} className="border-t border-white/25">
                <a href={`#${c.slug}`} className="group flex items-baseline justify-between gap-4 py-3 text-[1.125rem] font-medium">
                  <span className="u-link">{c.name}</span>
                  <span className="font-mono text-[0.875rem] text-white/75">{c.product_count}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </PageHero>

      {categories.map((c, i) => {
        const items = products.filter((p) => p.category_id === c.id);
        return (
          <Section key={c.slug} id={c.slug} rule={i > 0} gap="sm" labelledBy={`h-${c.slug}`}>
            <div className="grid gap-10 lg:grid-cols-[3fr_2fr] lg:items-end lg:gap-24">
              <div>
                <div className="product-tile relative mb-8 hidden h-28 w-28 overflow-hidden lg:block">
                  {c.image_path && <Image src={mediaUrl(c.image_path)!} alt="" fill sizes="112px" className="object-contain p-3" />}
                </div>
                <h2 id={`h-${c.slug}`} className="h2 max-w-[48rem]" data-split>
                  {c.name}
                </h2>
              </div>
              <div className="flex flex-col items-start gap-8">
                <p className="lead" data-reveal>
                  {c.description}
                </p>
                <Link href={`/products/${c.slug}`} className="large-link">
                  <LargeLinkLabel>View {c.name.toLowerCase()}</LargeLinkLabel>
                </Link>
              </div>
            </div>
            <div className="product-grid mt-16" data-rise>
              {items.map((p) => (
                <ProductCard key={p.id} product={p} showCategory={false} />
              ))}
            </div>
          </Section>
        );
      })}
    </>
  );
}
