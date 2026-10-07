import Link from "next/link";
import type { Metadata } from "next";
import { buttonClass } from "@/components/ui/button";
import { PageHero } from "@/components/ui/primitives";
import { Check } from "@/components/ui/icons";
import { TrackOnMount } from "@/components/site/tracked";
import { serverEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: "Thank you",
  robots: { index: false, follow: false },
};

export default async function ThankYouPage({ searchParams }: PageProps<"/request-a-quote/thank-you">) {
  const sp = await searchParams;
  const type = sp.type === "contact" ? "contact" : sp.type === "distributor" ? "distributor" : "rfq";
  const ref = typeof sp.ref === "string" && /^KI-\d{6}-[A-F0-9]{4}$/.test(sp.ref) ? sp.ref : null;
  const emailEnabled = Boolean(serverEnv().resendApiKey);

  return (
    <>
      <TrackOnMount event={type === "contact" ? "contact_submit" : "generate_lead"} params={{ enquiry_type: type }} />
      <PageHero
        eyebrow={
          <span className="grid h-14 w-14 place-items-center rounded-[0.25rem] bg-accent text-white">
            <Check size={26} />
          </span>
        }
        title={type === "rfq" ? "Your quotation request is in." : "Thank you — message received."}
        lead={`Our team will reply by email, usually within one business day.${emailEnabled ? " A confirmation has been sent to your inbox." : ""}`}
      >
        <div className="flex flex-col gap-8">
          {ref && (
            <p className="text-[1.125rem] font-medium text-white/80">
              Your reference: <span className="font-mono text-white">{ref}</span>
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Link href="/products" className={buttonClass("inverse", "lg")}>
              Continue browsing
            </Link>
            <Link href="/" className={buttonClass("secondary", "lg", "border-white/40 text-white hover:border-white")}>
              Home
            </Link>
          </div>
          <p className="text-[1rem] text-white/80">
            {emailEnabled ? "Didn't get the confirmation email? Check your spam folder or " : "Need to add something? "}
            <Link href="/contact" className="u-link text-white">
              contact us directly
            </Link>
            .
          </p>
        </div>
      </PageHero>
    </>
  );
}
