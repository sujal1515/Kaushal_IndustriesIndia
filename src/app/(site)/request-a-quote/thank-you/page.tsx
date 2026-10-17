import Link from "next/link";
import type { Metadata } from "next";
import { buttonClass } from "@/components/ui/button";
import { PageHero } from "@/components/ui/primitives";
import { Check } from "@/components/ui/icons";
import { TrackOnMount } from "@/components/site/tracked";
import { serverEnv } from "@/lib/env";
import { getPageContent } from "@/lib/cms/content";

export const metadata: Metadata = {
  title: "Thank you",
  robots: { index: false, follow: false },
};

export default async function ThankYouPage({ searchParams }: PageProps<"/request-a-quote/thank-you">) {
  const sp = await searchParams;
  const type = sp.type === "contact" ? "contact" : sp.type === "distributor" ? "distributor" : "rfq";
  const ref = typeof sp.ref === "string" && /^KI-\d{6}-[A-F0-9]{4}$/.test(sp.ref) ? sp.ref : null;
  const emailEnabled = Boolean(serverEnv().resendApiKey);
  const { messages: m } = await getPageContent("thank-you");

  return (
    <>
      <TrackOnMount event={type === "contact" ? "contact_submit" : "generate_lead"} params={{ enquiry_type: type }} />
      <PageHero
        eyebrow={
          <span className="grid h-14 w-14 place-items-center rounded-[0.25rem] bg-accent text-white">
            <Check size={26} />
          </span>
        }
        title={type === "rfq" ? m.rfqTitle : m.messageTitle}
        lead={`${m.lead}${emailEnabled ? ` ${m.emailSent}` : ""}`}
      >
        <div className="flex flex-col gap-8">
          {ref && (
            <p className="text-[1.125rem] font-medium text-white/80">
              {m.reference} <span className="font-mono text-white">{ref}</span>
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Link href="/products" className={buttonClass("inverse", "lg")}>
              {m.browse}
            </Link>
            <Link href="/" className={buttonClass("secondary", "lg", "border-white/40 text-white hover:border-white")}>
              {m.home}
            </Link>
          </div>
          <p className="text-[1rem] text-white/80">
            {emailEnabled ? `${m.missingEmail} ` : `${m.addSomething} `}
            <Link href="/contact" className="u-link text-white">
              {m.contactLink}
            </Link>
            .
          </p>
        </div>
      </PageHero>
    </>
  );
}
