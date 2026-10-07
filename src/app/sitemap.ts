import type { MetadataRoute } from "next";
import { getCatalogue } from "@/lib/data/catalogue";
import { absoluteUrl } from "@/lib/site";

const STATIC_PAGES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/products", priority: 0.9, changeFrequency: "weekly" },
  { path: "/applications", priority: 0.7, changeFrequency: "monthly" },
  { path: "/about", priority: 0.6, changeFrequency: "yearly" },
  { path: "/quality-certifications", priority: 0.6, changeFrequency: "monthly" },
  { path: "/export-markets", priority: 0.6, changeFrequency: "yearly" },
  { path: "/resources", priority: 0.6, changeFrequency: "monthly" },
  { path: "/request-a-quote", priority: 0.8, changeFrequency: "yearly" },
  { path: "/contact", priority: 0.7, changeFrequency: "yearly" },
  { path: "/privacy-policy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/website-terms", priority: 0.2, changeFrequency: "yearly" },
  { path: "/disclaimer", priority: 0.2, changeFrequency: "yearly" },
];

/** Generated from published categories, products and applications (blueprint §9.2). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const c = await getCatalogue();
  const visible = ["published", "coming_soon", "discontinued"];
  const categories = c.categories.filter((x) => visible.includes(x.status));
  const products = c.products.filter((p) => visible.includes(p.status));
  const latest = (dates: string[]) => new Date(dates.sort().at(-1) ?? Date.now());

  return [
    ...STATIC_PAGES.map((p) => ({
      url: absoluteUrl(p.path),
      lastModified: p.path === "/" || p.path === "/products" ? latest(products.map((x) => x.updated_at)) : undefined,
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    })),
    ...categories.map((cat) => ({
      url: absoluteUrl(`/products/${cat.slug}`),
      lastModified: latest([cat.updated_at, ...products.filter((p) => p.category_id === cat.id).map((p) => p.updated_at)]),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...products.flatMap((p) => {
      const cat = categories.find((x) => x.id === p.category_id);
      if (!cat) return [];
      return [
        {
          url: absoluteUrl(`/products/${cat.slug}/${p.slug}`),
          lastModified: new Date(p.updated_at),
          changeFrequency: "monthly" as const,
          priority: p.status === "published" ? 0.8 : 0.5,
        },
      ];
    }),
    ...c.applications
      .filter((a) => a.status === "published")
      .map((a) => ({
        url: absoluteUrl(`/applications/${a.slug}`),
        lastModified: new Date(a.updated_at),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
  ];
}
