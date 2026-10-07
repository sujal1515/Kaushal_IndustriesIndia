import Link from "next/link";

export function NoAccess() {
  return (
    <div className="rounded-xl border border-line bg-surface p-10 text-center">
      <h1 className="text-xl font-semibold">You don&apos;t have access to this section</h1>
      <p className="mt-2 text-sm text-muted">Ask an administrator if you need it.</p>
      <Link href="/admin" className="mt-6 inline-block text-sm underline underline-offset-4">
        Back to dashboard
      </Link>
    </div>
  );
}
