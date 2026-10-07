import type { ReactNode } from "react";
import { PageHero } from "@/components/ui/primitives";
import { Section } from "@/components/ui/system";

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
        <div className="max-w-[52rem] text-[1.125rem] font-[450] leading-[1.7] tracking-[-0.01rem] text-ink-soft min-[992px]:pl-24 [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mb-5 [&_h2]:mt-20 [&_h2]:text-[2rem] [&_h2]:font-medium [&_h2]:leading-[1.2] [&_h2]:tracking-[-0.06rem] [&_h2]:text-ink max-[767px]:[&_h2]:text-[1.5rem] [&_li]:mt-3 [&_p+p]:mt-6 [&_strong]:text-ink [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6">
          {children}
        </div>
      </Section>
    </>
  );
}
