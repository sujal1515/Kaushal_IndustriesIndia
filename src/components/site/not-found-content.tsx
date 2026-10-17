import Link from "next/link";
import { getPageContent } from "@/lib/cms/content";
import { buttonClass } from "@/components/ui/button";
import { PageHero } from "@/components/ui/primitives";
import { Search } from "@/components/ui/icons";

export async function NotFoundContent() {
  const { hero } = await getPageContent("not-found");
  return (
    <PageHero eyebrow={hero.eyebrow} title={hero.title} lead={hero.lead}>
      <div className="flex flex-col gap-8">
        <form action="/search" method="get" role="search">
          <label htmlFor="nf-q" className="sr-only">
            Search products
          </label>
          <div className="relative">
            <Search size={20} className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-white/75" />
            <input
              id="nf-q"
              name="q"
              type="search"
              placeholder={hero.placeholder}
              className="form-input !border-white/40 !pl-8 !text-white placeholder:!text-white/60 focus:!border-white"
            />
          </div>
        </form>
        <div className="flex flex-wrap gap-3">
          <Link href="/products" className={buttonClass("inverse", "lg")}>
            {hero.productsButton}
          </Link>
          <Link href="/contact" className={buttonClass("secondary", "lg", "border-white/40 text-white hover:border-white")}>
            {hero.contactButton}
          </Link>
        </div>
        <p className="text-[1rem] text-white/80">
          {hero.pricePrompt}{" "}
          <Link href="/request-a-quote" className="u-link text-white">
            {hero.priceLink}
          </Link>
          .
        </p>
      </div>
    </PageHero>
  );
}
