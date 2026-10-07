import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { PageHero } from "@/components/ui/primitives";
import { Search } from "@/components/ui/icons";

export function NotFoundContent() {
  return (
    <PageHero
      eyebrow="404"
      title="This page has moved or doesn't exist."
      lead="Our website has a new structure. Search for a product or model code, or start from the product range."
    >
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
              placeholder="Product or model code"
              className="form-input !border-white/40 !pl-8 !text-white placeholder:!text-white/60 focus:!border-white"
            />
          </div>
        </form>
        <div className="flex flex-wrap gap-3">
          <Link href="/products" className={buttonClass("inverse", "lg")}>
            View products
          </Link>
          <Link href="/contact" className={buttonClass("secondary", "lg", "border-white/40 text-white hover:border-white")}>
            Contact us
          </Link>
        </div>
        <p className="text-[1rem] text-white/80">
          Looking for a price?{" "}
          <Link href="/request-a-quote" className="u-link text-white">
            Request a quote
          </Link>
          .
        </p>
      </div>
    </PageHero>
  );
}
