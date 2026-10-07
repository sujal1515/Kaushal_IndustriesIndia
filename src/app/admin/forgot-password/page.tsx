import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm } from "@/components/admin/action-form";
import { inputClass } from "@/components/admin/ui";
import { requestPasswordReset } from "../_actions/auth";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-[-0.025em]">Reset your password</h1>
        <p className="mt-2 text-sm text-muted">We&apos;ll email you a link to choose a new password.</p>
        <div className="mt-8 rounded-2xl border border-line bg-surface p-6">
          <ActionForm action={requestPasswordReset} submitLabel="Send reset link">
            <label className="grid gap-1.5 text-sm font-medium">
              Email
              <input name="email" type="email" autoComplete="username" required className={inputClass} />
            </label>
          </ActionForm>
        </div>
        <p className="mt-6 text-center text-sm">
          <Link href="/admin/login" className="text-muted underline underline-offset-4 hover:text-ink">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
