import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { ConsentBanner } from "@/components/site/consent";
import { SmoothScroll } from "@/components/motion/smooth-scroll";
import { JsonLd } from "@/components/ui/primitives";
import { getSearchIndex, getSettings, listCategories } from "@/lib/data/catalogue";
import { mediaUrl } from "@/lib/env";
import { organizationJsonLd } from "@/lib/seo";

/** Public-site shell: skip link, header, main, footer, consent banner and Organization schema. */
export async function SiteChrome({ children }: { children: React.ReactNode }) {
  const [categories, settings, searchIndex] = await Promise.all([listCategories(), getSettings(), getSearchIndex()]);
  const navCategories = categories.map(({ slug, name, description, product_count, image_path }) => ({
    slug,
    name,
    description,
    product_count,
    image: mediaUrl(image_path),
  }));

  return (
    <>
      <a
        href="#main"
        className="fixed left-3 top-3 z-[130] -translate-y-20 rounded-[0.25rem] bg-ink px-4 py-2 text-sm text-white transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>
      <Header categories={navCategories} phone={settings.phones[0]} whatsapp={settings.whatsapp} searchIndex={searchIndex} />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <Footer categories={navCategories} settings={settings} />
      <ConsentBanner />
      <SmoothScroll />
      <JsonLd data={organizationJsonLd(settings)} />
    </>
  );
}
