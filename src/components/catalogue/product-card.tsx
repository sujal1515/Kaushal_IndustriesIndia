import Image from "next/image";
import Link from "next/link";
import { mediaUrl } from "@/lib/env";
import type { ProductSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/primitives";
import { ArrowRight } from "@/components/ui/icons";
import { TrackedLink } from "@/components/site/tracked";

export function productHref(p: Pick<ProductSummary, "category_slug" | "slug">) {
  return `/products/${p.category_slug}/${p.slug}`;
}

/**
 * Product card: the whole card opens the product; "Request a quote" goes straight to the RFQ
 * form with this product filled in. Image zooms on hover and a light label follows the pointer.
 */
export function ProductCard({
  product,
  priority = false,
  showCategory = true,
  className,
}: {
  product: ProductSummary;
  priority?: boolean;
  showCategory?: boolean;
  className?: string;
}) {
  const img = mediaUrl(product.primary_image?.storage_path);
  const specs = product.key_specs.filter((s) => s.label !== "Models").slice(0, 2);
  const unavailable = product.status === "coming_soon" || product.status === "discontinued";
  return (
    <article className={cn("group relative flex h-full flex-col border-t border-line pt-5", className)}>
      <div className="media-frame product-tile relative aspect-[4/3] w-full">
        {img && (
          <Image
            src={img}
            alt={product.primary_image?.alt_text ?? product.name}
            fill
            priority={priority}
            sizes="(min-width: 1200px) 30vw, (min-width: 640px) 45vw, 100vw"
            className="media-zoom object-contain p-[10%]"
          />
        )}
        <div className="absolute left-4 top-4">
          <StatusBadge status={product.status} />
        </div>
      </div>
      {showCategory && <p className="eyebrow mt-6">{product.category_name}</p>}
      <h3 className={cn("text-[1.75rem] font-medium leading-[1.15] tracking-[-0.04em] max-[767px]:text-[1.5rem]", showCategory ? "mt-2" : "mt-6")}>
        <Link href={productHref(product)} className="u-link after:absolute after:inset-0 after:content-['']">
          {product.name}
        </Link>
      </h3>
      {product.summary && <p className="text-body mt-3 line-clamp-3 text-muted">{product.summary}</p>}
      {specs.length > 0 && (
        <dl className="mt-auto grid grid-cols-2 gap-6 border-t border-line pt-5 [&:not(:first-child)]:mt-6">
          {specs.map((s) => (
            <div key={s.label}>
              <dt className="font-mono text-[0.8125rem] font-medium uppercase leading-snug text-accent">{s.label}</dt>
              <dd className="mt-1 text-[1.0625rem] font-medium tracking-[-0.01em]">{s.value.split(" · ")[0]}</dd>
            </div>
          ))}
        </dl>
      )}
      <TrackedLink
        href={`/request-a-quote?product=${product.slug}&category=${product.category_slug}`}
        event="quote_start"
        params={{ location: "product_card", product: product.slug, category: product.category_slug }}
        className="group/quote relative z-20 mt-6 inline-flex items-center gap-2 self-start text-[1rem] font-medium text-accent"
      >
        <span className="decoration-1 underline-offset-[0.3em] group-hover/quote:underline">{unavailable ? "Register interest" : "Request a quote"}</span>
        <ArrowRight size={16} className="transition-transform duration-500 ease-[var(--ease-expo)] group-hover/quote:translate-x-1" />
      </TrackedLink>
    </article>
  );
}
