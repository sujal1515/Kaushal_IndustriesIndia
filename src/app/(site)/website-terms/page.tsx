import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = pageMetadata({
  title: "Website Terms of Use",
  description: "Terms governing the use of the Kaushal Industries website.",
  path: "/website-terms",
});

// DRAFT — for review and approval by the client's legal adviser before launch.
export default function TermsPage() {
  return (
    <LegalPage title="Website terms of use" path="/website-terms" updated="October 2026">
      <p>
        By using this website you accept these terms. If you do not agree, please do not use the website.
      </p>

      <h2>Information on this website</h2>
      <p>
        Product information, specifications and images are provided for general guidance and relate to our standard
        products. They do not form an offer or a contract. Specifications may change without notice; please confirm them
        with us before ordering. See our <Link href="/disclaimer">disclaimer</Link>.
      </p>

      <h2>Quotations and orders</h2>
      <p>
        Submitting a request for quotation does not create a contract. Any sale is governed by the quotation, order
        confirmation and terms we issue to you directly.
      </p>

      <h2>Intellectual property</h2>
      <p>
        The content of this website — text, images, specifications, logos and design — belongs to {site.legalName} or its
        licensors. You may view, print and download it for evaluating our products; any other use requires our written
        permission.
      </p>

      <h2>Acceptable use</h2>
      <p>
        You must not misuse this website, including by submitting false enquiries, attempting to gain unauthorised access,
        or interfering with its operation.
      </p>

      <h2>Links</h2>
      <p>We are not responsible for the content of third-party websites linked from this site.</p>

      <h2>Liability</h2>
      <p>
        To the extent permitted by law, we are not liable for any loss arising from use of, or reliance on, this website.
      </p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of India.</p>

      <h2>Contact</h2>
      <p>
        Questions about these terms: <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>.
      </p>
    </LegalPage>
  );
}
