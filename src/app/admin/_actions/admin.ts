"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertRole, revalidateCatalogue, runAction, type ActionState } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/clients";
import { absoluteUrl } from "@/lib/site";
import { dbError, lines, str } from "@/lib/admin/parse";

/* ---------------- Settings (admin) ---------------- */

export async function saveSettings(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const { supabase } = await assertRole(["admin"]);
    const emails = String(fd.get("notification_emails") ?? "")
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const e of emails) if (!z.email().safeParse(e).success) throw new Error(`“${e}” is not a valid email address.`);
    if (!emails.length) throw new Error("Add at least one notification email address.");
    const phones = lines(fd, "phones");
    if (!phones.length) throw new Error("Add at least one phone number.");
    const email = str(fd, "email", { required: true, max: 200 });
    if (!z.email().safeParse(email).success) throw new Error("Public email is not valid.");
    const rows = [
      { key: "notification_emails", value: emails },
      { key: "phones", value: phones },
      { key: "whatsapp", value: str(fd, "whatsapp", { required: true, max: 30 }) },
      { key: "email", value: email },
      { key: "address_lines", value: lines(fd, "address_lines") },
    ];
    dbError((await supabase.from("site_settings").upsert(rows, { onConflict: "key" })).error);
    revalidateCatalogue();
    return "Settings saved";
  });
}

/* ---------------- Users (admin) ---------------- */

const ROLES = ["admin", "editor", "sales"] as const;

export async function inviteUser(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    await assertRole(["admin"]);
    const service = createServiceClient();
    if (!service) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured — invites need it.");
    const input = z
      .object({ email: z.email(), full_name: z.string().trim().min(2).max(120), role: z.enum(ROLES) })
      .parse({ email: fd.get("email"), full_name: fd.get("full_name"), role: fd.get("role") });

    const { data, error } = await service.auth.admin.inviteUserByEmail(input.email, {
      data: { full_name: input.full_name },
      redirectTo: absoluteUrl("/auth/confirm?next=/admin/set-password"),
    });
    if (error) throw new Error(error.message);
    // The trigger created an inactive profile; activate it with the chosen role.
    dbError(
      (
        await service
          .from("profiles")
          .upsert({ id: data.user.id, email: input.email, full_name: input.full_name, role: input.role, is_active: true })
      ).error,
    );
    revalidatePath("/admin/users");
    return `Invitation sent to ${input.email}`;
  });
}

export async function updateUser(userId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const { staff, supabase } = await assertRole(["admin"]);
    const role = z.enum(ROLES).parse(fd.get("role"));
    const active = fd.get("is_active") === "on";
    if (userId === staff.id && (role !== "admin" || !active)) {
      throw new Error("You can't remove your own admin access. Ask another administrator.");
    }
    dbError((await supabase.from("profiles").update({ role, is_active: active, full_name: str(fd, "full_name", { max: 120 }) || null }).eq("id", userId)).error);
    revalidatePath("/admin/users");
    return "User updated";
  });
}
