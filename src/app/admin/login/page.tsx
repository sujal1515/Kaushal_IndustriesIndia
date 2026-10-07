import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  "no-access": "Your account doesn't have admin access, or it has been deactivated.",
  link: "That link is invalid or has expired. Request a new one.",
};

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/admin";
  const error = typeof sp.error === "string" ? ERRORS[sp.error] : undefined;

  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="w-full max-w-sm">
        <p className="eyebrow">Kaushal Industries</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.025em]">Sign in to the admin</h1>
        {error && <p className="mt-4 rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p>}
        <div className="mt-8 rounded-2xl border border-line bg-surface p-6">
          <LoginForm next={next} />
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/admin/forgot-password" className="underline underline-offset-4 hover:text-ink">
            Forgot password?
          </Link>
          <span className="mx-2">·</span>
          <Link href="/" className="underline underline-offset-4 hover:text-ink">
            Back to website
          </Link>
        </p>
      </div>
    </div>
  );
}
