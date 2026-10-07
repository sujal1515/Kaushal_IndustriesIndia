import type { MetadataRoute } from "next";
import { absoluteUrl, site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Preview deployments are additionally blocked with X-Robots-Tag in next.config.ts.
  const isPreview = process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production";
  return {
    rules: isPreview
      ? [{ userAgent: "*", disallow: "/" }]
      : [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/request-a-quote/thank-you", "/search"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: site.url,
  };
}
