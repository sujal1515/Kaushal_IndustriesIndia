import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { createSessionClient } from "@/lib/supabase/clients";
import { isSupabaseConfigured } from "@/lib/env";
import { CATALOGUE_TAG } from "@/lib/data/catalogue";
import type { AdminRole } from "@/lib/types";

export type Staff = {
  id: string;
  email: string;
  full_name: string | null;
  role: AdminRole;
};

/** Current signed-in, active staff member (deduplicated per request). */
export const getStaff = cache(async (): Promise<Staff | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !profile.is_active) return null;
  return { id: profile.id, email: profile.email ?? user.email ?? "", full_name: profile.full_name, role: profile.role };
});

/** For pages: redirect to login when signed out or inactive. */
export async function requireStaff(): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login?error=no-access");
  return staff;
}

export function hasRole(staff: Staff, roles: AdminRole[]) {
  return roles.includes(staff.role);
}

export class ActionError extends Error {}

/** For server actions: throw when the caller lacks one of the roles (RLS is the second line of defence). */
export async function assertRole(roles: AdminRole[]) {
  const staff = await getStaff();
  if (!staff) throw new ActionError("Your session has expired. Please sign in again.");
  if (!roles.includes(staff.role)) throw new ActionError("You don't have permission to do that.");
  const supabase = await createSessionClient();
  return { staff, supabase };
}

/** Expire the public catalogue cache immediately after an admin change (blueprint §6.2). */
export function revalidateCatalogue() {
  updateTag(CATALOGUE_TAG);
  revalidatePath("/", "layout");
}

export type ActionState = { ok?: boolean; message?: string; error?: string; at?: number };

/** Wraps a server action body so permission/validation errors become form messages. */
export async function runAction(fn: () => Promise<string | void>): Promise<ActionState> {
  try {
    const message = await fn();
    return { ok: true, message: message || "Saved", at: Date.now() };
  } catch (e) {
    // Let Next.js redirects/notFound propagate.
    if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_")) throw e;
    const error = e instanceof Error ? e.message : "Something went wrong";
    return { ok: false, error, at: Date.now() };
  }
}

export const ROLE_LABEL: Record<AdminRole, string> = {
  admin: "Administrator",
  editor: "Catalogue editor",
  sales: "Sales",
};

export const CATALOGUE_ROLES: AdminRole[] = ["admin", "editor"];
export const ENQUIRY_ROLES: AdminRole[] = ["admin", "sales"];
