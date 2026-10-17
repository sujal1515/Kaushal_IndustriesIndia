import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CATALOGUE_ROLES, hasRole, requireStaff } from "@/lib/admin/auth";
import { createSessionClient } from "@/lib/supabase/clients";
import { cmsPages, isPageKey } from "@/lib/cms/pages";
import { mergeContent } from "@/lib/cms/schema";
import { listSiteImages } from "@/lib/admin/site-images";
import { AdminHeader, adminButton } from "@/components/admin/ui";
import { NoAccess } from "@/components/admin/no-access";
import { CmsEditor, type Revision } from "@/components/admin/cms/editor";

export async function generateMetadata({ params }: PageProps<"/admin/content/[key]">): Promise<Metadata> {
  const { key } = await params;
  return { title: isPageKey(key) ? `Edit · ${cmsPages[key].label}` : "Edit page" };
}

export default async function EditPage({ params }: PageProps<"/admin/content/[key]">) {
  const staff = await requireStaff();
  if (!hasRole(staff, CATALOGUE_ROLES)) return <NoAccess />;
  const { key } = await params;
  if (!isPageKey(key)) notFound();
  const def = cmsPages[key];

  const supabase = await createSessionClient();
  const [{ data: live }, { data: draft }, { data: revs }, { data: assets }] = await Promise.all([
    supabase.from("cms_pages").select("content, published_at").eq("key", key).maybeSingle(),
    supabase.from("cms_drafts").select("content, updated_at").eq("key", key).maybeSingle(),
    supabase
      .from("cms_revisions")
      .select("id, created_at, note, author:profiles(full_name, email)")
      .eq("key", key)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(25),
    supabase.from("media_assets").select("id, path, file_name, alt_text").order("created_at", { ascending: false }).limit(300),
  ]);

  const initial = mergeContent(def.defaults, draft?.content ?? live?.content ?? null) as Record<string, Record<string, unknown>>;
  const revisions: Revision[] = (revs ?? []).map((r) => {
    const a = (Array.isArray(r.author) ? r.author[0] : r.author) as { full_name?: string | null; email?: string | null } | null;
    return { id: r.id as number, created_at: r.created_at as string, note: r.note as string | null, author: a?.full_name || a?.email || null };
  });

  return (
    <>
      <AdminHeader
        back={{ href: "/admin/content", label: "Pages" }}
        title={def.label}
        description={def.path ? <span className="font-mono">{def.path}</span> : "Shown across the site"}
        actions={
          def.path ? (
            <Link href={def.path} target="_blank" className={adminButton("ghost")}>
              View live page ↗
            </Link>
          ) : undefined
        }
      />
      <CmsEditor
        pageKey={key}
        initial={initial}
        hasDraft={!!draft}
        publishedAt={live?.published_at ?? null}
        draftSavedAt={draft?.updated_at ?? null}
        revisions={revisions}
        assets={assets ?? []}
        siteImages={listSiteImages()}
      />
    </>
  );
}
