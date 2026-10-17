import "server-only";
import { unstable_cache } from "next/cache";
import { draftMode } from "next/headers";
import type { Metadata } from "next";
import { createPublicClient, createSessionClient } from "@/lib/supabase/clients";
import { isSupabaseConfigured } from "@/lib/env";
import { pageMetadata } from "@/lib/seo";
import { cmsPages, type PageContent, type PageKey } from "./pages";
import { mergeContent } from "./schema";

/** Cache tag for published page content; publishing expires it. */
export const CMS_TAG = "cms";

const loadPublished = unstable_cache(
  async (key: string): Promise<unknown> => {
    const db = createPublicClient();
    if (!db) return null;
    const { data, error } = await db.from("cms_pages").select("content").eq("key", key).maybeSingle();
    if (error) {
      console.error(`[cms] could not load "${key}":`, error.message);
      return null;
    }
    return data?.content ?? null;
  },
  ["cms-page"],
  { tags: [CMS_TAG], revalidate: 3600 },
);

/** Draft (or, failing that, published) content — only for signed-in content staff in preview. */
async function loadDraft(key: string): Promise<unknown> {
  const db = await createSessionClient();
  const { data: draft } = await db.from("cms_drafts").select("content").eq("key", key).maybeSingle();
  if (draft?.content) return draft.content;
  const { data: live } = await db.from("cms_pages").select("content").eq("key", key).maybeSingle();
  return live?.content ?? null;
}

/** Whether the visitor is previewing drafts (an editor who pressed "Preview"). */
export async function isPreview() {
  if (!isSupabaseConfigured) return false;
  try {
    return (await draftMode()).isEnabled;
  } catch {
    return false; // outside a request (e.g. build-time metadata)
  }
}

/** Page content: stored content merged over the page's defaults. */
export async function getPageContent<K extends PageKey>(key: K): Promise<PageContent<K>> {
  const defaults = cmsPages[key].defaults as PageContent<K>;
  if (!isSupabaseConfigured) return defaults;
  const stored = (await isPreview()) ? await loadDraft(key) : await loadPublished(key);
  return mergeContent(defaults, stored);
}

/** Page metadata from the page's "Search engines" section. */
export async function cmsMetadata(
  key: PageKey,
  path: string,
  extra: { image?: string | null; absoluteTitle?: boolean } = {},
): Promise<Metadata> {
  const content = (await getPageContent(key)) as { seo?: { title?: string; description?: string } };
  const title = content.seo?.title ?? "";
  const meta = pageMetadata({ title, description: content.seo?.description ?? "", path, image: extra.image });
  return extra.absoluteTitle ? { ...meta, title: { absolute: title } } : meta;
}
