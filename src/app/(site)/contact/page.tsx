import type { Metadata } from "next";
import { getSettings } from "@/lib/data/catalogue";
import { countries } from "@/lib/enquiry/options";
import { pageMetadata } from "@/lib/seo";
import { site, telHref, whatsappHref } from "@/lib/site";
import { PageHero } from "@/components/ui/primitives";
import { Section } from "@/components/ui/system";
import { Mail, MapPin, Phone, WhatsApp } from "@/components/ui/icons";
import { EnquiryForm } from "@/components/forms/enquiry-form";
import { MapEmbed } from "@/components/site/map-embed";
import { TrackedAnchor } from "@/components/site/tracked";

export const metadata: Metadata = pageMetadata({
  title: "Contact Kaushal Industries — Agra, India",
  description:
    "Contact Kaushal Industries, 12/55 Nagla Balchand, Nunhai, Agra 282006, India. Call, WhatsApp or email our sales team, or send us a message.",
  path: "/contact",
});

export default async function ContactPage() {
  const settings = await getSettings();
  const channels = [
    ...settings.phones.map((p) => ({ icon: Phone, label: "Call", value: p, href: telHref(p), method: "phone", external: false })),
    { icon: WhatsApp, label: "WhatsApp", value: settings.whatsapp, href: whatsappHref(settings.whatsapp), method: "whatsapp", external: true },
    { icon: Mail, label: "Email", value: settings.email, href: `mailto:${settings.email}`, method: "email", external: false },
  ];

  return (
    <>
      {/* Contact channels sit in the brand panel, like the reference contact page */}
      <PageHero
        eyebrow="Contact"
        title="Talk to our sales team."
        lead="Call, WhatsApp or email us — or send a message below. For pricing, the quickest route is a request for quotation."
        crumbs={[{ label: "Contact", href: "/contact" }]}
      >
        <ul className="border-b border-white/25">
          {channels.map((c) => (
            <li key={`${c.method}-${c.value}`} className="border-t border-white/25">
              <TrackedAnchor
                href={c.href}
                {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                event="contact_click"
                params={{ method: c.method, location: "contact_page" }}
                className="group flex items-center gap-4 py-3.5"
              >
                <c.icon size={20} className="shrink-0 text-sky" />
                <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-4">
                  <span className="font-mono text-[0.875rem] font-medium uppercase text-white/75">{c.label}</span>
                  <span className="u-link break-all text-[1.125rem] font-medium">{c.value}</span>
                </span>
              </TrackedAnchor>
            </li>
          ))}
        </ul>
      </PageHero>

      {/* Form + address ("section_cta is--contact") */}
      <Section rule={false} gap="sm">
        <div className="grid gap-24 lg:grid-cols-[3fr_2fr]">
          <div>
            <h2 className="h2" data-split>
              Send a message
            </h2>
            <p className="text-regular mt-6 text-muted">General questions, spares, documents or anything else.</p>
            <div className="mt-16">
              <EnquiryForm mode="contact" countryList={countries()} />
            </div>
          </div>

          <aside>
            <div className="fixed-element items-stretch">
              <div>
                <h2 className="flex items-center gap-3 text-regular">
                  <MapPin size={20} className="text-accent" /> {site.legalName}
                </h2>
                <address className="text-regular mt-4 not-italic text-ink-soft">
                  {settings.address_lines.map((l) => (
                    <span key={l} className="block">
                      {l}
                    </span>
                  ))}
                </address>
                <p className="mt-4 font-mono text-[0.875rem] font-medium uppercase text-muted">Contact: {site.contact.contactPerson}</p>
              </div>
              <MapEmbed src={site.contact.mapEmbedUrl} link={site.contact.mapLink} label="Kaushal Industries, Nunhai, Agra" />
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
