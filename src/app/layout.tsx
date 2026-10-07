import type { Metadata, Viewport } from "next";
import { DM_Mono, Inter_Tight } from "next/font/google";
import { publicEnv } from "@/lib/env";
import { site } from "@/lib/site";
import { gtmHeadScript } from "@/components/site/consent";
import "./globals.css";

// Inter Tight stands in for the reference design's Elza (a commercial Adobe font licensed to
// that site's domain): closest open-licence match in width, weight and x-height. DM Mono is
// the same open-licence mono the reference uses for its uppercase labels.
const interTight = Inter_Tight({ variable: "--font-inter-tight", subsets: ["latin"], display: "swap" });
const dmMono = DM_Mono({ variable: "--font-dm-mono", subsets: ["latin"], weight: ["400", "500"], display: "swap" });

const MOTION_BOOT = `(function(){try{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;var d=document.documentElement;d.classList.add('motion');setTimeout(function(){if(!window.__motionReady)d.classList.remove('motion')},3000)}catch(e){}})();`;

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — Diesel Engines, Generating Sets & Pumps | Agra, India`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: "en_IN",
    url: "/",
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#f7efe8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const gtmId = publicEnv.gtmId;
  return (
    <html lang="en-IN" className={`${interTight.variable} ${dmMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Enable scroll-motion pre-hide before first paint; fall back to visible content if
            the motion script hasn't started within 3s (slow network / blocked JS). */}
        <script dangerouslySetInnerHTML={{ __html: MOTION_BOOT }} />
        {gtmId ? <script dangerouslySetInnerHTML={{ __html: gtmHeadScript(gtmId) }} /> : null}
      </head>
      <body className="min-h-dvh bg-paper text-ink">
        {gtmId ? (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
              title="Google Tag Manager"
            />
          </noscript>
        ) : null}
        {children}
      </body>
    </html>
  );
}
