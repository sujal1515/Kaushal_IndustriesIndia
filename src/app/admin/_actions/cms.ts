"use server";

import { revalidatePath, updateTag } from "next/cache";
import { assertRole, CATALOGUE_ROLES, runAction, type ActionState } from "@/lib/admin/auth";
import { CMS_TAG } from "@/lib/cms/content";
import { isPageKey, pageDef, type PageKey } from "@/lib/cms/pages";
import { validateContent } from "@/lib/cms/schema";

const CONTENT_ROLES = CATALOGUE_ROLES; // administrators and editors

function parse(key: string, json: string) {
  if (!isPageKey(key)) throw new Error("Unknown page.");
  if (json.length > 500_000) throw new Error("This page is too large to save.");
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error("The content could not be read. Reload the editor and try again.");
  }
  return { key: key as PageKey, content: validateContent(pageDef(key as PageKey), data) };
}

function refreshPublic(key: PageKey) {
  updateTag(CMS_TAG);
  const path = pageDef(key).path;
  if (key === "global" || key === "not-found") revalidatePath("/", "layout");
  else if (path) revalidatePath(path);
}

/** Save the editor's working copy. The live site is unchanged until the page is published. */
export async function saveDraft(key: string, json: string): Promise<ActionState> {
  return runAction(async () => {
    const { staff, supabase } = await assertRole(CONTENT_ROLES);
    const { content } = parse(key, json);
    const { error } = await supabase.from("cms_drafts").upsert({ key, content, updated_by: staff.id });
    if (error) throw new Error(error.message);
    revalidatePath(`/admin/content/${key}`);
    revalidatePath("/admin/content");
    return "Draft saved";
  });
}

/** Publish content: it goes live, a revision is recorded, and the draft is cleared. */
export async function publishPage(key: string, json: string, note?: string): Promise<ActionState> {
  return runAction(async () => {
    const { staff, supabase } = await assertRole(CONTENT_ROLES);
    const { key: k, content } = parse(key, json);
    // First publish of a page: keep what was live (the seeded original) so it can be restored.
    const { count } = await supabase.from("cms_revisions").select("id", { count: "exact", head: true }).eq("key", key);
    if (!count) {
      const { data: live } = await supabase.from("cms_pages").select("content").eq("key", key).maybeSingle();
      if (live) await supabase.from("cms_revisions").insert({ key, content: live.content, note: "Original version", created_by: staff.id });
    }
    const { error } = await supabase
      .from("cms_pages")
      .upsert({ key, content, published_at: new Date().toISOString(), published_by: staff.id });
    if (error) throw new Error(error.message);
    await supabase.from("cms_revisions").insert({ key, content, note: note?.trim().slice(0, 200) || "Published", created_by: staff.id });
    await supabase.from("cms_drafts").delete().eq("key", key);
    refreshPublic(k);
    revalidatePath(`/admin/content/${key}`);
    revalidatePath("/admin/content");
    return "Published — the live page is updated";
  });
}

/** Throw away the working copy and go back to what is live. */
export async function discardDraft(key: string): Promise<ActionState> {
  return runAction(async () => {
    const { supabase } = await assertRole(CONTENT_ROLES);
    if (!isPageKey(key)) throw new Error("Unknown page.");
    const { error } = await supabase.from("cms_drafts").delete().eq("key", key);
    if (error) throw new Error(error.message);
    revalidatePath(`/admin/content/${key}`);
    revalidatePath("/admin/content");
    return "Draft discarded";
  });
}

/** Load an earlier published version into the draft, to review and publish again. */
export async function restoreRevision(key: string, revisionId: number): Promise<ActionState> {
  return runAction(async () => {
    const { staff, supabase } = await assertRole(CONTENT_ROLES);
    if (!isPageKey(key)) throw new Error("Unknown page.");
    const { data: rev, error } = await supabase.from("cms_revisions").select("content").eq("id", revisionId).eq("key", key).maybeSingle();
    if (error || !rev) throw new Error("Revision not found.");
    const content = validateContent(pageDef(key), rev.content);
    const { error: saveErr } = await supabase.from("cms_drafts").upsert({ key, content, updated_by: staff.id });
    if (saveErr) throw new Error(saveErr.message);
    revalidatePath(`/admin/content/${key}`);
    return "Revision loaded into the draft — review it, then publish";
  });
}
