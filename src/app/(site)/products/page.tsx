import Image from "next/image";
import Link from "next/link";
import { listCategories, listProducts } from "@/lib/data/catalogue";
import { mediaUrl } from "@/lib/env";
import { cmsMetadata, getPageContent } from "@/lib/cms/content";
import { fill } from "@/lib/cms/schema";
import { PageHero } from "@/components/ui/primitives";
import { LargeLinkLabel, Section } from "@/components/ui/system";
import { ProductCard } from "@/components/catalogue/product-card";

export const generateMetadata = () => cmsMetadata("products", "/products");

export default async function ProductsPage() {
  const [categories, products, c] = await Promise.all([listCategories(), listProducts(), getPageContent("products")]);
  return (
    <>
      <PageHero
        eyebrow={c.hero.eyebrow}
        title={c.hero.title}
        lead={c.hero.lead}
        crumbs={[{ label: "Products", href: "/products" }]}
      >
        <nav aria-label="Product categories">
          <ul className="border-b border-white/25">
            {categories.map((cat) => (
              <li key={cat.slug} className="border-t border-white/25">
                <a href={`#${cat.slug}`} className="group flex items-baseline justify-between gap-4 py-3 text-[1.125rem] font-medium">
                  <span className="u-link">{cat.name}</span>
                  <span className="font-mono text-[0.875rem] text-white/75">{cat.product_count}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </PageHero>

      {categories.map((cat, i) => {
        const items = products.filter((p) => p.category_id === cat.id);
        return (
          <Section key={cat.slug} id={cat.slug} rule={i > 0} gap="sm" labelledBy={`h-${cat.slug}`}>
            <div className="grid gap-10 lg:grid-cols-[3fr_2fr] lg:items-end lg:gap-24">
              <div>
                <div className="product-tile relative mb-8 hidden h-28 w-28 overflow-hidden lg:block">
                  {cat.image_path && <Image src={mediaUrl(cat.image_path)!} alt="" fill sizes="112px" className="object-contain p-3" />}
                </div>
                <h2 id={`h-${cat.slug}`} className="h2 max-w-[48rem]" data-split>
                  {cat.name}
                </h2>
              </div>
              <div className="flex flex-col items-start gap-8">
                <p className="lead" data-reveal>
                  {cat.description}
                </p>
                <Link href={`/products/${cat.slug}`} className="large-link">
                  <LargeLinkLabel>{fill(c.labels.viewCategory, { category: cat.name.toLowerCase() })}</LargeLinkLabel>
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
