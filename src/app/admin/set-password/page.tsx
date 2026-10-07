import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm } from "@/components/admin/action-form";
import { inputClass } from "@/components/admin/ui";
import { setPassword } from "../_actions/auth";

export const metadata: Metadata = { title: "Choose a password" };

export default function SetPasswordPage() {
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-[-0.025em]">Choose a password</h1>
        <p className="mt-2 text-sm text-muted">At least 12 characters. A passphrase works well.</p>
        <div className="mt-8 rounded-2xl border border-line bg-surface p-6">
          <ActionForm action={setPassword} submitLabel="Save password">
            <label className="grid gap-1.5 text-sm font-medium">
              New password
              <input name="password" type="password" autoComplete="new-password" minLength={12} required className={inputClass} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Confirm password
              <input name="confirm" type="password" autoComplete="new-password" minLength={12} required className={inputClass} />
            </label>
          </ActionForm>
        </div>
        <p className="mt-6 text-center text-sm">
          <Link href="/admin" className="text-muted underline underline-offset-4 hover:text-ink">
            Continue to the admin →
          </Link>
        </p>
      </div>
    </div>
  );
}
