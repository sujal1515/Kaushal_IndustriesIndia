import type { Metadata } from "next";
import { MfaVerify } from "@/components/admin/mfa";

export const metadata: Metadata = { title: "Two-step verification" };

export default async function MfaPage({ searchParams }: PageProps<"/admin/mfa">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/admin";
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-[-0.025em]">Two-step verification</h1>
        <p className="mt-2 text-sm text-muted">Enter the code from your authenticator app.</p>
        <div className="mt-8 rounded-2xl border border-line bg-surface p-6">
          <MfaVerify next={next} />
        </div>
      </div>
    </div>
  );
}
