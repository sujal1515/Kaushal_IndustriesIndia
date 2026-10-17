import Image from "next/image";
import { cmsMetadata, getPageContent } from "@/lib/cms/content";
import { mediaUrl, STORAGE_BUCKETS } from "@/lib/env";
import { PageHero, SectionHeader } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { Section } from "@/components/ui/system";
import { ArrowRight } from "@/components/ui/icons";

export const generateMetadata = () => cmsMetadata("about", "/about");

export default async function AboutPage() {
  const [c, site] = await Promise.all([getPageContent("about"), getPageContent("global")]);
  return (
    <>
      <PageHero eyebrow={c.hero.eyebrow} title={c.hero.title} lead={c.hero.lead} crumbs={[{ label: "About", href: "/about" }]} />

      {/* Introduction — staggered image grid + sticky text */}
      <Section label={c.intro.label} rule={false} gap="none">
        <div className="content-wrapper mt-16">
          <ul className="start-grid" aria-label="Kaushal products" data-rise>
            {c.intro.images.map((img, i) => {
              const src = mediaUrl(img.image, STORAGE_BUCKETS.siteMedia);
              const cover = img.fit === "cover";
              return (
                <li key={`${img.image}-${i}`} className="grid-item">
                  <div className="media-frame product-tile relative h-[24rem] max-[991px]:h-[22rem] max-[479px]:h-[14rem]">
                    {src && (
                      <Image
                        src={src}
                        alt={img.alt}
                        fill
                        sizes="(min-width: 992px) 26vw, 45vw"
                        className={cover ? "media-zoom object-cover !mix-blend-normal" : "media-zoom object-contain p-[12%]"}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="content-aside">
            <div className="fixed-element gap-6">
              {c.intro.paragraphs.map((p, i) => (
                <p key={i} className="text-regular">
                  {p.text}
                </p>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Timeline */}
      <Section label={c.history.label}>
        <h2 className="h2 max-w-[48rem]" data-split>
          {c.history.title}
        </h2>
        <ol className="mt-16 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4" data-rise>
          {c.history.items.map((t, i) => (
            <li key={`${t.title}-${i}`} className="grid-item">
              <p className="h2 text-accent">{t.year}</p>
              <h3 className="mt-8 text-regular">{t.title}</h3>
              <p className="mt-3 text-[1.0625rem] font-medium leading-relaxed text-muted">{t.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Capability */}
      <Section label={c.capability.label}>
        <SectionHeader title={c.capability.title} lead={c.capability.lead} />
        <ul className="mt-20 grid gap-x-6 gap-y-16 sm:grid-cols-2 lg:grid-cols-3" data-rise>
          {c.capability.items.map((item, i) => (
            <li key={`${item.title}-${i}`} className="grid-item">
              <span className="font-mono text-[0.875rem] font-medium text-accent">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="h3 mt-8">{item.title}</h3>
              <p className="mt-4 text-[1.0625rem] font-medium leading-relaxed text-muted">{item.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* Group — brand band */}
      <section className="relative z-[1] overflow-clip bg-ink text-white">
        <div className="padding-global">
          <div className="py-32 max-[479px]:py-20">
            <p className="eyebrow !text-white/75">{c.group.eyebrow}</p>
            <h2 className="h2 mt-6 max-w-[48rem]" data-split>
              {c.group.title}
            </h2>
            <ul className="mt-20 grid gap-x-6 gap-y-12 md:grid-cols-3" data-rise>
              {c.group.companies.map((g, i) => (
                <li key={`${g.name}-${i}`} className="border-t border-white/25 pt-6">
                  <h3 className="h3">{g.name}</h3>
                  <p className="mt-3 font-mono text-[0.875rem] font-medium uppercase text-white/75">{g.location}</p>
                  <p className="mt-8 text-[1.0625rem] font-medium leading-relaxed text-white/85">{g.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Export experience + team */}
      <Section rule={false} gap="sm">
        <div className="grid gap-24 lg:grid-cols-2">
          <div className="flex flex-col items-start">
            <p className="eyebrow">{c.export.eyebrow}</p>
            <h2 className="h2 mt-6" data-split>
              {c.export.title}
            </h2>
            <p className="text-regular mt-8 max-w-[36rem]">{c.export.body}</p>
            <ul className="mt-10 flex flex-wrap gap-2">
              {site.lists.exportRegions.map((r) => (
                <li key={r} className="rounded-[0.25rem] border border-line-strong px-2.5 py-1 font-mono text-[0.8rem] font-medium uppercase text-ink-soft">
                  {r}
                </li>
              ))}
            </ul>
            <ButtonLink href="/export-markets" variant="secondary" className="mt-12">
              {c.export.linkLabel} <ArrowRight size={16} />
            </ButtonLink>
          </div>
          <div className="flex flex-col items-start">
            <p className="eyebrow">{c.team.eyebrow}</p>
            <h2 className="h2 mt-6" data-split>
              {c.team.title}
            </h2>
            <p className="text-regular mt-8 max-w-[36rem]">{c.team.body}</p>
            {c.team.quote && <blockquote className="h3 mt-12 border-l-2 border-accent pl-8">{c.team.quote}</blockquote>}
          </div>
        </div>
      </Section>

      {c.leadership.people.length > 0 && (
        <Section label={c.leadership.label}>
          <h2 className="h2 max-w-[48rem]" data-split>
            {c.leadership.title}
          </h2>
          <ul className="mt-16 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {c.leadership.people.map((l, i) => (
              <li key={`${l.name}-${i}`} className="grid-item">
                <h3 className="h3">{l.name}</h3>
                <p className="mt-2 font-mono text-[0.875rem] font-medium uppercase text-accent">{l.role}</p>
                {l.bio && <p className="mt-4 text-[1.0625rem] font-medium leading-relaxed text-muted">{l.bio}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
