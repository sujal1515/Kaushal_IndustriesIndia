import type { ReactNode } from "react";
import { getSettings } from "@/lib/data/catalogue";
import { getPageContent } from "@/lib/cms/content";
import { fill } from "@/lib/cms/schema";
import { site } from "@/lib/site";
import { PageHero } from "@/components/ui/primitives";
import { Section } from "@/components/ui/system";
import { Markdown } from "@/components/ui/markdown";

/** Legal copy in the reference "content" section: indented rich text, 60rem measure. */
export function LegalPage({
  title,
  path,
  updated,
  children,
}: {
  title: string;
  path: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <>
      <PageHero eyebrow={`Last updated ${updated}`} title={title} crumbs={[{ label: title, href: path }]} />
      <Section rule={false} gap="sm">
        <div className="max-w-[52rem] text-[1.125rem] font-[450] leading-[1.7] tracking-[-0.01rem] text-ink-soft min-[992px]:pl-24 [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mb-5 [&_h2]:mt-20 [&_h2]:text-[2rem] [&_h2]:font-medium [&_h2]:leading-[1.2] [&_h2]:tracking-[-0.06rem] [&_h2]:text-ink max-[767px]:[&_h2]:text-[1.5rem] [&_h3]:mb-4 [&_h3]:mt-12 [&_h3]:text-[1.375rem] [&_h3]:font-medium [&_h3]:text-ink [&_li]:mt-3 [&_p+p]:mt-6 [&_strong]:text-ink [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6">
          {children}
        </div>
      </Section>
    </>
  );
}

/** A legal page whose title, date and text are edited in the CMS. */
export async function CmsLegalPage({ pageKey, path }: { pageKey: "privacy-policy" | "website-terms" | "disclaimer"; path: string }) {
  const [content, settings] = await Promise.all([getPageContent(pageKey), getSettings()]);
  const tokens = {
    company: site.legalName,
    email: settings.email,
    domain: site.url.replace(/^https?:\/\//, ""),
    address: settings.address_lines.join(", "),
  };
  return (
    <LegalPage title={content.page.title} path={path} updated={content.page.updated}>
      <Markdown text={fill(content.page.body, tokens)} />
    </LegalPage>
  );
}
