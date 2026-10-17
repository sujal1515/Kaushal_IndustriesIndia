import Link from "next/link";
import { legalNav, site, telHref, whatsappHref } from "@/lib/site";
import type { SiteSettings } from "@/lib/types";
import { LargeLinkLabel, SectionTop } from "@/components/ui/system";
import { Logo } from "./logo";
import { TrackedAnchor, TrackedLink } from "./tracked";
import { CookieSettingsButton } from "./consent";
import type { PageContent } from "@/lib/cms/pages";

const company = [
  { label: "About Kaushal", href: "/about" },
  { label: "Applications", href: "/applications" },
  { label: "Quality & certifications", href: "/quality-certifications" },
  { label: "Export markets", href: "/export-markets" },
  { label: "Resources & FAQs", href: "/resources" },
  { label: "Contact", href: "/contact" },
];

/**
 * Closing call to action ("section_cta") and the four-column footer ("footer_wrapper"):
 * hairline top, 256px of air, 20px links at 60% that come up to full on hover.
 */
export function Footer({
  categories,
  settings,
  content,
}: {
  categories: { slug: string; name: string }[];
  settings: SiteSettings;
  content: PageContent<"global">;
}) {
  const year = new Date().getFullYear();
  return (
    <>
      <section className="section no-print" aria-label="Request for quotation" data-motion-global>
        <div className="padding-global">
          <div className="section-rule">
            <SectionTop label={content.cta.label} />
            <div className="section-inner grid gap-10 lg:grid-cols-[3fr_2fr] lg:items-end lg:gap-24">
              <p className="h2 max-w-[48rem]" data-split>
                {content.cta.title}
              </p>
              <div className="flex flex-col items-start gap-10" data-reveal>
                <p className="lead text-accent">{content.cta.lead}</p>
                <TrackedLink href="/request-a-quote" event="quote_start" params={{ location: "footer" }} className="large-link">
                  <LargeLinkLabel>{content.cta.button}</LargeLinkLabel>
                </TrackedLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="section">
        <div className="padding-global">
          <div data-grid-draw className="mt-24 grid gap-10 border-t border-line pb-20 pt-20 max-[991px]:grid-cols-2 max-[991px]:gap-12 max-[479px]:mt-16 max-[479px]:grid-cols-1 max-[479px]:pt-14 min-[992px]:grid-cols-4">
            <div className="flex flex-col items-start gap-8">
              <Logo />
              <p className="max-w-[22rem] text-[1rem] leading-relaxed text-ink/60">{content.footer.description}</p>
            </div>

            <div className="flex flex-col items-start gap-8">
              <h2 className="text-regular">Products</h2>
              <ul className="flex flex-col items-start gap-1">
                {categories.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/products/${c.slug}`} className="footer-link">
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col items-start gap-8">
              <h2 className="text-regular">Company</h2>
              <ul className="flex flex-col items-start gap-1">
                {company.map((c) => (
                  <li key={c.href}>
                    <Link href={c.href} className="footer-link">
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col items-start gap-8">
              <h2 className="text-regular">Contact</h2>
              <address className="flex flex-col items-start gap-1 not-italic">
                <span className="footer-link !opacity-60">
                  {settings.address_lines.map((l) => (
                    <span key={l} className="block">
                      {l}
                    </span>
                  ))}
                </span>
                {settings.phones.map((p) => (
                  <TrackedAnchor
                    key={p}
                    href={telHref(p)}
                    event="contact_click"
                    params={{ method: "phone", location: "footer" }}
                    className="footer-link"
                  >
                    {p}
                  </TrackedAnchor>
                ))}
                <TrackedAnchor
                  href={`mailto:${settings.email}`}
                  event="contact_click"
                  params={{ method: "email", location: "footer" }}
                  className="footer-link"
                >
                  {settings.email}
                </TrackedAnchor>
                <TrackedAnchor
                  href={whatsappHref(settings.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  event="contact_click"
                  params={{ method: "whatsapp", location: "footer" }}
                  className="footer-link"
                >
                  WhatsApp {settings.whatsapp}
                </TrackedAnchor>
              </address>
            </div>
          </div>

          <div data-grid-draw className="flex flex-col gap-4 border-t border-line py-8 text-[1rem] font-medium text-ink/60 md:flex-row md:items-center md:justify-between">
            <p>
              © {year} {site.legalName}. All rights reserved.
            </p>
            <ul className="flex flex-wrap gap-x-8 gap-y-2">
              {legalNav.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="u-link transition-colors hover:text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <CookieSettingsButton className="u-link transition-colors hover:text-ink" />
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </>
  );
}
