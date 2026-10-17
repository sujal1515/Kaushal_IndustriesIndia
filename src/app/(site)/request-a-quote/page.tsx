import { getCatalogue, getSettings, listApplications, listProducts } from "@/lib/data/catalogue";
import { countries } from "@/lib/enquiry/options";
import { cmsMetadata, getPageContent } from "@/lib/cms/content";
import { fill } from "@/lib/cms/schema";
import { telHref, whatsappHref } from "@/lib/site";
import { PageHero } from "@/components/ui/primitives";
import { Section } from "@/components/ui/system";
import { Clock, Mail, Phone, WhatsApp } from "@/components/ui/icons";
import { EnquiryForm, type FormProduct } from "@/components/forms/enquiry-form";
import { TrackedAnchor } from "@/components/site/tracked";

export const generateMetadata = () => cmsMetadata("request-a-quote", "/request-a-quote");

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function RequestQuotePage({ searchParams }: PageProps<"/request-a-quote">) {
  const sp = await searchParams;
  const [products, applications, catalogue, settings, c] = await Promise.all([
    listProducts(),
    listApplications(),
    getCatalogue(),
    getSettings(),
    getPageContent("request-a-quote"),
  ]);

  const formProducts: FormProduct[] = products.map((p) => ({
    slug: p.slug,
    name: p.name,
    category: p.category_name,
    status: p.status,
    models: catalogue.models
      .filter((m) => m.product_id === p.id && m.status !== "draft")
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((m) => m.model_code),
  }));

  const productParam = one(sp.product);
  const preselected = formProducts.find((p) => p.slug === productParam);
  const modelParam = one(sp.model);
  const typeParam = one(sp.type) === "distributor" ? "distributor" : "rfq";

  return (
    <>
      <PageHero
        eyebrow={c.hero.eyebrow}
        title={preselected ? fill(c.hero.titleWithProduct, { product: preselected.name }) : c.hero.title}
        lead={c.hero.lead}
        crumbs={[{ label: "Request a quote", href: "/request-a-quote" }]}
      >
        <div className="flex flex-col gap-6">
          {preselected && modelParam && preselected.models.includes(modelParam) && (
            <p className="inline-flex items-center gap-2 self-start rounded-[0.25rem] bg-white/15 px-4 py-2.5 text-[1rem] font-medium">
              Model <span className="font-mono">{modelParam}</span> selected
            </p>
          )}
          <ul className="border-b border-white/25 text-[1.125rem] font-medium">
            <li className="flex items-center gap-4 border-t border-white/25 py-3.5 text-white/80">
              <Clock size={20} className="shrink-0 text-sky" /> {c.hero.replyNote}
            </li>
            <li className="border-t border-white/25">
              <TrackedAnchor
                href={telHref(settings.phones[0])}
                event="contact_click"
                params={{ method: "phone", location: "rfq_page" }}
                className="group flex items-center gap-4 py-3.5"
              >
                <Phone size={20} className="shrink-0 text-sky" /> <span className="u-link">{settings.phones[0]}</span>
              </TrackedAnchor>
            </li>
            <li className="border-t border-white/25">
              <TrackedAnchor
                href={whatsappHref(settings.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                event="contact_click"
                params={{ method: "whatsapp", location: "rfq_page" }}
                className="group flex items-center gap-4 py-3.5"
              >
                <WhatsApp size={20} className="shrink-0 text-sky" /> <span className="u-link">{c.hero.whatsappLabel}</span>
              </TrackedAnchor>
            </li>
            <li className="border-t border-white/25">
              <TrackedAnchor
                href={`mailto:${settings.email}`}
                event="contact_click"
                params={{ method: "email", location: "rfq_page" }}
                className="group flex items-center gap-4 py-3.5"
              >
                <Mail size={20} className="shrink-0 text-sky" /> <span className="u-link break-all">{settings.email}</span>
              </TrackedAnchor>
            </li>
          </ul>
        </div>
      </PageHero>

      <Section rule={false} gap="sm" ariaLabel="Request a quote form">
        <div className="max-w-[64rem]">
          <EnquiryForm
            key={`${productParam}-${modelParam}-${typeParam}`}
            mode={typeParam}
            allowTypeSwitch
            products={formProducts}
            applications={applications.map((a) => ({ slug: a.slug, name: a.name }))}
            countryList={countries()}
            defaults={{
              product: preselected?.slug,
              model: preselected?.models.includes(modelParam) ? modelParam : undefined,
              application: applications.some((a) => a.slug === one(sp.application)) ? one(sp.application) : undefined,
            }}
          />
        </div>
      </Section>
    </>
  );
}
