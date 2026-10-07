import type { Metadata } from "next";
import { absoluteUrl, site } from "@/lib/site";
import { mediaUrl } from "@/lib/env";
import type { ProductDetail, SiteSettings } from "@/lib/types";

/** Page metadata with a self-referencing canonical and Open Graph defaults (blueprint §9.2). */
export function pageMetadata({
  title,
  description,
  path,
  image,
  noindex,
}: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  noindex?: boolean;
}): Metadata {
  const img = image ? mediaUrl(image) : null;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      ...(img ? { images: [{ url: img }] } : {}),
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

export function organizationJsonLd(settings: SiteSettings) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${site.url}/#organization`,
    name: site.legalName,
    url: site.url,
    logo: absoluteUrl(site.logo),
    foundingDate: String(site.foundingYear),
    description: site.description,
    email: settings.email,
    telephone: settings.phones[0],
    address: {
      "@type": "PostalAddress",
      streetAddress: site.contact.streetAddress,
      addressLocality: site.contact.locality,
      addressRegion: site.contact.region,
      postalCode: site.contact.postalCode,
      addressCountry: site.contact.country,
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "sales",
        telephone: settings.phones[0],
        email: settings.email,
        areaServed: "Worldwide",
        availableLanguage: ["English", "Hindi"],
      },
    ],
  };
}

/**
 * Product schema without offers, prices or reviews — none exist and none are fabricated
 * (blueprint §9.2). Each model is listed as a ProductModel variant.
 */
export function productJsonLd(p: ProductDetail, path: string) {
  const images = p.images.map((i) => mediaUrl(i.storage_path)).filter(Boolean).map((u) => (u!.startsWith("/") ? absoluteUrl(u!) : u));
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${absoluteUrl(path)}#product`,
    name: p.name,
    description: p.summary ?? undefined,
    url: absoluteUrl(path),
    image: images.length ? images : undefined,
    category: p.category.name,
    brand: { "@type": "Brand", name: site.name },
    manufacturer: { "@id": `${site.url}/#organization` },
    additionalProperty: p.key_specs.map((s) => ({ "@type": "PropertyValue", name: s.label, value: s.value })),
    ...(p.models.length
      ? {
          model: p.models.map((m) => ({
            "@type": "ProductModel",
            name: `${p.name} ${m.model_code}`,
            model: m.model_code,
          })),
        }
      : {}),
  };
}
