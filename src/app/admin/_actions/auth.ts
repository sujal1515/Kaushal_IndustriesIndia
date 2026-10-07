"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/clients";
import { absoluteUrl } from "@/lib/site";
import { runAction, type ActionState } from "@/lib/admin/auth";

const safeNext = (n: FormDataEntryValue | null) => {
  const v = typeof n === "string" ? n : "";
  return v.startsWith("/admin") && !v.startsWith("//") ? v : "/admin";
};

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z
    .object({ email: z.email(), password: z.string().min(1) })
    .safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { ok: false, error: "Enter your email and password.", at: Date.now() };

  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { ok: false, error: "Incorrect email or password.", at: Date.now() };

  const { data: profile } = await supabase.from("profiles").select("is_active").eq("id", data.user.id).maybeSingle();
  if (!profile?.is_active) {
    await supabase.auth.signOut();
    return { ok: false, error: "Your account is not active. Ask an administrator for access.", at: Date.now() };
  }
  redirect(safeNext(formData.get("next")));
}

export async function signOut() {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function requestPasswordReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = z.email().safeParse(formData.get("email"));
  if (!email.success) return { ok: false, error: "Enter a valid email address.", at: Date.now() };
  const supabase = await createSessionClient();
  await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: absoluteUrl("/auth/confirm?next=/admin/set-password"),
  });
  // Same response whether or not the account exists.
  return { ok: true, message: "If that address has an account, a reset link is on its way.", at: Date.now() };
}

export async function setPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");
    if (password.length < 12) throw new Error("Use at least 12 characters.");
    if (password !== confirm) throw new Error("The passwords don't match.");
    const supabase = await createSessionClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
    return "Password updated";
  });
}
