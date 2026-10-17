import Link from "next/link";
import type { Metadata } from "next";
import { CATALOGUE_ROLES, hasRole, requireStaff } from "@/lib/admin/auth";
import { createSessionClient } from "@/lib/supabase/clients";
import { cmsPages, type PageKey } from "@/lib/cms/pages";
import type { PageGroup } from "@/lib/cms/schema";
import { formatDateTime } from "@/lib/utils";
import { AdminHeader, Pill } from "@/components/admin/ui";
import { NoAccess } from "@/components/admin/no-access";

export const metadata: Metadata = { title: "Pages" };

const GROUPS: PageGroup[] = ["Site-wide", "Pages", "Forms & system pages", "Legal"];

const who = (p: unknown) => {
  const x = (Array.isArray(p) ? p[0] : p) as { full_name?: string | null; email?: string | null } | null;
  return x?.full_name || x?.email || null;
};

export default async function ContentPage() {
  const staff = await requireStaff();
  if (!hasRole(staff, CATALOGUE_ROLES)) return <NoAccess />;
  const supabase = await createSessionClient();
  const [{ data: live }, { data: drafts }] = await Promise.all([
    supabase.from("cms_pages").select("key, published_at, publisher:profiles(full_name, email)"),
    supabase.from("cms_drafts").select("key, updated_at, editor:profiles(full_name, email)"),
  ]);
  const liveMap = new Map((live ?? []).map((r) => [r.key as string, r]));
  const draftMap = new Map((drafts ?? []).map((r) => [r.key as string, r]));

  return (
    <>
      <AdminHeader
        title="Pages"
        description="Edit the text, images and search-engine details of every page. Changes are saved as drafts — preview them on the real site, then publish."
      />
      <div className="grid gap-8">
        {GROUPS.map((group) => {
          const pages = (Object.keys(cmsPages) as PageKey[]).filter((k) => cmsPages[k].group === group);
          return (
            <section key={group}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted">{group}</h2>
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                {pages.map((k) => {
                  const def = cmsPages[k];
                  const l = liveMap.get(k);
                  const d = draftMap.get(k);
                  return (
                    <li key={k}>
                      <Link href={`/admin/content/${k}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 transition-colors hover:bg-paper">
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{def.label}</span>
                          <span className="block text-xs text-muted">{def.path ?? "Shown across the site"}</span>
                        </span>
                        {d && (
                          <Pill tone="warn">
                            Draft · {formatDateTime(d.updated_at)}
                            {who(d.editor) ? ` · ${who(d.editor)}` : ""}
                          </Pill>
                        )}
                        {l ? (
                          <span className="text-xs text-muted">
                            Live · {formatDateTime(l.published_at)}
                            {who(l.publisher) ? ` · ${who(l.publisher)}` : ""}
                          </span>
                        ) : (
                          <Pill>Default content</Pill>
                        )}
                        <span aria-hidden className="text-muted">
                          →
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
