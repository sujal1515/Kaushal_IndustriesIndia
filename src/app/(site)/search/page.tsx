import Link from "next/link";
import type { Metadata } from "next";
import { searchCatalogue } from "@/lib/data/catalogue";
import { getPageContent } from "@/lib/cms/content";
import { PageHero } from "@/components/ui/primitives";
import { Section } from "@/components/ui/system";
import { Search } from "@/components/ui/icons";
import { ProductCard, productHref } from "@/components/catalogue/product-card";
import { SearchTracker } from "./search-tracker";

export const metadata: Metadata = {
  title: "Search products and models",
  description: "Search Kaushal Industries products by name, application or model code.",
  alternates: { canonical: "/search" },
  robots: { index: false, follow: true },
};

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim().slice(0, 100) ?? "";
  const [hits, { hero }] = await Promise.all([q ? searchCatalogue(q) : Promise.resolve([]), getPageContent("search")]);

  return (
    <>
      <PageHero eyebrow={hero.eyebrow} title={hero.title} crumbs={[{ label: "Search", href: "/search" }]}>
        <form action="/search" method="get" role="search">
          <label htmlFor="q" className="sr-only">
            Search by product, application or model code
          </label>
          <div className="relative">
            <Search size={22} className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-white/75" />
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q}
              autoFocus
              placeholder={hero.placeholder}
              className="form-input !border-white/40 !pl-9 !text-[1.25rem] !text-white placeholder:!text-white/60 focus:!border-white"
            />
          </div>
        </form>
      </PageHero>

      <Section rule={false} gap="sm">
        {q && <SearchTracker term={q} results={hits.length} />}
        {q && (
          <p className="mb-16 font-mono text-[0.875rem] font-medium uppercase text-muted" aria-live="polite">
            {hits.length} result{hits.length === 1 ? "" : "s"} for “{q}”
          </p>
        )}
        {hits.length > 0 && (
          <div className="product-grid" data-rise>
            {hits.map((h) => (
              <div key={h.product.id} className="flex flex-col gap-5">
                <ProductCard product={h.product} />
                {h.matchedModels.length > 0 && (
                  <p className="flex flex-wrap items-center gap-2 font-mono text-[0.875rem] font-medium uppercase text-muted">
                    Matching models:
                    {h.matchedModels.slice(0, 8).map((m) => (
                      <Link
                        key={m}
                        href={`${productHref(h.product)}#model-${m}`}
                        className="rounded-[0.25rem] bg-accent-soft px-2.5 py-1 normal-case text-accent-strong transition-colors hover:bg-accent hover:text-white"
                      >
                        {m}
                      </Link>
                    ))}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        {q && hits.length === 0 && (
          <div className="border-y border-line py-16 text-center">
            <p className="h3">No products match “{q}”.</p>
            <p className="text-regular mt-4 text-muted">
              Check the model code, browse{" "}
              <Link href="/products" className="u-link text-ink">
                all products
              </Link>
              , or{" "}
              <Link href="/request-a-quote" className="u-link text-ink">
                tell us what you need
              </Link>
              .
            </p>
          </div>
        )}
        {!q && (
          <div className="flex flex-wrap gap-3">
            {["Air cooled", "Water cooled", "Generating set", "Pump", "EF1A", "EL2", "Irrigation"].map((s) => (
              <Link
                key={s}
                href={`/search?q=${encodeURIComponent(s)}`}
                className="rounded-[0.25rem] border border-line-strong px-4 py-2.5 text-[1rem] font-medium transition-colors duration-[450ms] hover:border-ink"
              >
                {s}
              </Link>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
