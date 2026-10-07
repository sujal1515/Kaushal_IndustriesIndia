/**
 * Site-wide configuration and defaults.
 * Contact values here are fallbacks; admins can override them in
 * Admin → Settings (stored in the `site_settings` table).
 * Every factual claim below is listed in docs/CLIENT-APPROVALS.md and must be
 * re-approved by the client before launch (blueprint §11.3, p.7).
 */
export const site = {
  name: "Kaushal Industries",
  legalName: "Kaushal Industries",
  shortName: "Kaushal",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://www.kia-india.com").replace(/\/$/, ""),
  tagline: "Diesel engines, generating sets and pumps — manufactured in Agra since 1964.",
  description:
    "Kaushal Industries manufactures and exports stationary diesel engines, diesel generating sets, centrifugal water pumps, agricultural machinery and castings from Agra, India — since 1964.",
  foundingYear: 1964,
  exportCountries: "60+",
  logo: "/images/brand/kaushal-mark.png",
  contact: {
    addressLines: ["12/55, Nagla Balchand, Nunhai", "Agra 282006, Uttar Pradesh", "India"],
    streetAddress: "12/55, Nagla Balchand, Nunhai",
    locality: "Agra",
    region: "Uttar Pradesh",
    postalCode: "282006",
    country: "IN",
    phones: ["+91 97197 01128", "+91 70377 50480"],
    whatsapp: "+91 97197 01128",
    email: "kia@kia-india.com",
    contactPerson: "Avnish Kaushal",
    geo: { lat: 27.199401747710226, lng: 78.04096695570004 },
    mapEmbedUrl:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d7097.257565767372!2d78.04096695570004!3d27.199401747710226!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x397477261ece80ad%3A0x2b820ab57fcb9ff3!2sKaushal%20Industries%2C%20Agra!5e0!3m2!1sen!2sin!4v1727136157215!5m2!1sen!2sin",
    mapLink: "https://maps.google.com/?q=Kaushal+Industries+Agra",
  },
} as const;

export const mainNav = [
  { label: "Products", href: "/products" },
  { label: "Applications", href: "/applications" },
  { label: "Quality", href: "/quality-certifications" },
  { label: "Export", href: "/export-markets" },
  { label: "Resources", href: "/resources" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

export const legalNav = [
  { label: "Privacy policy", href: "/privacy-policy" },
  { label: "Website terms", href: "/website-terms" },
  { label: "Disclaimer", href: "/disclaimer" },
] as const;

export function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function whatsappHref(phone: string, text?: string) {
  const n = phone.replace(/\D/g, "");
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function absoluteUrl(path = "/") {
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
}
