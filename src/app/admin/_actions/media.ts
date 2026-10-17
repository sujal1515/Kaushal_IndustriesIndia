"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertRole, CATALOGUE_ROLES, runAction, type ActionState } from "@/lib/admin/auth";
import { STORAGE_BUCKETS } from "@/lib/env";

export type MediaAsset = {
  id: string;
  path: string;
  file_name: string;
  alt_text: string;
  mime_type: string | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
  created_at: string;
};

const registerInput = z.object({
  path: z.string().min(1).max(500).regex(/^[a-z0-9/_.-]+$/i),
  file_name: z.string().min(1).max(200),
  alt_text: z.string().max(300).default(""),
  mime_type: z.string().max(100).nullable().default(null),
  file_size: z.number().int().nonnegative().nullable().default(null),
  width: z.number().int().positive().nullable().default(null),
  height: z.number().int().positive().nullable().default(null),
});

/** Record a file the browser has just uploaded to the site-media bucket. */
export async function registerMedia(input: z.input<typeof registerInput>): Promise<{ asset?: MediaAsset; error?: string }> {
  try {
    const { staff, supabase } = await assertRole(CATALOGUE_ROLES);
    const v = registerInput.parse(input);
    const { data, error } = await supabase
      .from("media_assets")
      .insert({ ...v, bucket: STORAGE_BUCKETS.siteMedia, created_by: staff.id })
      .select("id, path, file_name, alt_text, mime_type, file_size, width, height, created_at")
      .single();
    if (error) throw new Error(error.message);
    revalidatePath("/admin/media");
    return { asset: data as MediaAsset };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save the file details." };
  }
}

export async function updateMediaAlt(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const { supabase } = await assertRole(CATALOGUE_ROLES);
    const alt = z.string().trim().max(300).parse(formData.get("alt_text") ?? "");
    const { error } = await supabase.from("media_assets").update({ alt_text: alt }).eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/media");
    return "Description saved";
  });
}

/** Delete the file from storage and its record. Pages still pointing at it show no image. */
export async function deleteMedia(id: string): Promise<ActionState> {
  return runAction(async () => {
    const { supabase } = await assertRole(CATALOGUE_ROLES);
    const { data: asset, error } = await supabase.from("media_assets").select("bucket, path").eq("id", id).maybeSingle();
    if (error || !asset) throw new Error("File not found.");
    const { error: rmErr } = await supabase.storage.from(asset.bucket).remove([asset.path]);
    if (rmErr) throw new Error(rmErr.message);
    const { error: delErr } = await supabase.from("media_assets").delete().eq("id", id);
    if (delErr) throw new Error(delErr.message);
    revalidatePath("/admin/media");
    return "File deleted";
  });
}
