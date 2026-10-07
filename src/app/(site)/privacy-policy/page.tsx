import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description: "How Kaushal Industries collects, uses and protects the personal data you share through this website.",
  path: "/privacy-policy",
});

// DRAFT — describes what this website actually does. Must be reviewed and approved by the
// client's legal adviser before launch (blueprint §11.3 item 9; docs/CLIENT-APPROVALS.md).
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" path="/privacy-policy" updated="October 2026">
      <p>
        This policy explains how {site.legalName} (“we”, “us”) handles personal data collected through {site.url.replace(/^https?:\/\//, "")}.
        We collect only what we need to answer your enquiry and improve this website.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Enquiry details</strong> you submit through our quotation, distributor and contact forms: your name,
          company, email address, phone number, country, buyer type, and the details of your requirement (product, model,
          quantity, application, destination and timeline, and your message).
        </li>
        <li>
          <strong>Technical data</strong> sent with a form submission: the page you submitted from, your browser’s user
          agent, and a one-way hash of your IP address used to prevent spam. We do not store your raw IP address.
        </li>
        <li>
          <strong>Analytics data</strong>, only if you allow analytics cookies: pages viewed, products viewed, downloads and
          form interactions, collected through Google Analytics via Google Tag Manager.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To respond to your enquiry, prepare quotations and follow up on your request.</li>
        <li>To send you an acknowledgement of your enquiry by email.</li>
        <li>To protect the website and our team from spam and abuse.</li>
        <li>To understand, in aggregate, how buyers use this website, if you have allowed analytics.</li>
      </ul>
      <p>We do not sell your personal data and we do not use it for advertising.</p>

      <h2>Who processes it</h2>
      <p>
        Enquiries are stored in our database hosted by Supabase and delivered to our sales team by email through our
        transactional email provider. If you allow analytics, Google processes analytics data. Loading the interactive map
        on our contact page shares data with Google Maps. These providers process data on our behalf under their own terms.
      </p>

      <h2>Cookies</h2>
      <p>
        We use analytics cookies only with your consent, which you can change at any time through “Cookie settings” in the
        footer. Our administrators’ sign-in uses strictly necessary cookies. We set no advertising cookies.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep enquiry records for as long as needed to respond to you, manage any resulting business relationship, and
        meet our legal and accounting obligations, after which they are deleted.
      </p>

      <h2>Your rights</h2>
      <p>
        You may ask us to access, correct or delete the personal data we hold about you, or withdraw your consent, by
        emailing <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>. We will respond within a reasonable time
        and in line with applicable law, including India’s Digital Personal Data Protection Act, 2023.
      </p>

      <h2>Contact</h2>
      <p>
        {site.legalName}, {site.contact.addressLines.join(", ")}. Email{" "}
        <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>.
      </p>
    </LegalPage>
  );
}
