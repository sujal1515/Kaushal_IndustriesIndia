import type { Metadata } from "next";
import { isSupabaseConfigured } from "@/lib/env";

// Admin pages depend on the signed-in user — never prerender or cache them.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Kaushal Admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) {
    return (
      <div className="grid min-h-dvh place-items-center bg-paper p-6">
        <div className="max-w-lg rounded-2xl border border-line bg-surface p-8">
          <p className="eyebrow">Admin</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-0.02em]">Connect Supabase to enable the admin</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            The public website is running from the bundled catalogue. To manage products, resources and enquiries, set{" "}
            <code className="font-mono text-ink">NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
            <code className="font-mono text-ink">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and{" "}
            <code className="font-mono text-ink">SUPABASE_SERVICE_ROLE_KEY</code>, run the migrations and seed, then
            redeploy. Step-by-step instructions are in <code className="font-mono text-ink">docs/SETUP.md</code>.
          </p>
        </div>
      </div>
    );
  }
  return <div className="min-h-dvh bg-paper">{children}</div>;
}
