import type { Metadata } from "next";
import { disclaimer } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = pageMetadata({
  title: "Disclaimer",
  description: "Disclaimer for information and specifications published on the Kaushal Industries website.",
  path: "/disclaimer",
});

export default function DisclaimerPage() {
  return (
    <LegalPage title="Disclaimer" path="/disclaimer" updated="October 2026">
      <p>{disclaimer}</p>
    </LegalPage>
  );
}
