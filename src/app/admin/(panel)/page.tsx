import Link from "next/link";
import type { Metadata } from "next";
import { hasRole, requireStaff } from "@/lib/admin/auth";
import { createSessionClient } from "@/lib/supabase/clients";
import { publicEnv, serverEnv } from "@/lib/env";
import { formatDateTime } from "@/lib/utils";
import { AdminHeader, Card, Pill, Table, enquiryTone } from "@/components/admin/ui";
import { countryName } from "@/lib/enquiry/options";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const staff = await requireStaff();
  const supabase = await createSessionClient();
  const canEnquiries = hasRole(staff, ["admin", "sales"]);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const [products, models, newEnq, monthEnq, failed, recent] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("product_models").select("id", { count: "exact", head: true }),
    canEnquiries ? supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "new") : null,
    canEnquiries ? supabase.from("enquiries").select("id", { count: "exact", head: true }).gte("created_at", monthStart).neq("status", "spam") : null,
    canEnquiries ? supabase.from("enquiries").select("id", { count: "exact", head: true }).not("notify_error", "is", null) : null,
    canEnquiries
      ? supabase
          .from("enquiries")
          .select("id, reference, created_at, type, status, name, company, product_name_snapshot, destination_country, buyer_country")
          .order("created_at", { ascending: false })
          .limit(8)
      : null,
  ]);

  const env = serverEnv();
  const health = [
    { label: "Supabase", ok: true, note: "Connected" },
    { label: "Service role key", ok: !!env.supabaseServiceKey, note: env.supabaseServiceKey ? "Enquiries can be saved" : "Missing — enquiries cannot be stored" },
    { label: "Email (Resend)", ok: !!env.resendApiKey, note: env.resendApiKey ? "Notifications on" : "Missing — no email notifications" },
    { label: "Turnstile", ok: !!(publicEnv.turnstileSiteKey && env.turnstileSecret), note: publicEnv.turnstileSiteKey ? "Bot check on" : "Off — honeypot + rate limit only" },
    { label: "Google Tag Manager", ok: !!publicEnv.gtmId, note: publicEnv.gtmId || "Not configured" },
  ];

  const stats = [
    ...(canEnquiries
      ? [
          { label: "New enquiries", value: newEnq?.count ?? 0, href: "/admin/enquiries?status=new" },
          { label: "Enquiries this month", value: monthEnq?.count ?? 0, href: "/admin/enquiries" },
        ]
      : []),
    { label: "Published products", value: products.count ?? 0, href: "/admin/products" },
    { label: "Models", value: models.count ?? 0, href: "/admin/products" },
  ];

  return (
    <>
      <AdminHeader title={`Welcome${staff.full_name ? `, ${staff.full_name.split(" ")[0]}` : ""}`} description="Overview of the catalogue and incoming enquiries." />

      {canEnquiries && (failed?.count ?? 0) > 0 && (
        <Link href="/admin/enquiries?notify=failed" className="mb-6 block rounded-xl border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
          {failed!.count} enquir{failed!.count === 1 ? "y" : "ies"} could not be emailed to the sales inbox. The leads are saved — review them here.
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-xl border border-line bg-surface p-5 transition-colors hover:border-ink/30">
            <p className="text-sm text-muted">{s.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.03em]">{s.value}</p>
          </Link>
        ))}
      </div>

      {canEnquiries && recent && (
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Latest enquiries</h2>
            <Link href="/admin/enquiries" className="text-sm text-accent">
              View all →
            </Link>
          </div>
          <Table>
            <thead>
              <tr>
                <th>Received</th>
                <th>From</th>
                <th>Product</th>
                <th>Country</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(recent.data ?? []).map((e) => (
                <tr key={e.id} className="hover:bg-paper">
                  <td className="whitespace-nowrap text-muted">{formatDateTime(e.created_at)}</td>
                  <td>
                    <Link href={`/admin/enquiries/${e.id}`} className="font-medium hover:underline">
                      {e.name}
                    </Link>
                    {e.company && <span className="block text-xs text-muted">{e.company}</span>}
                  </td>
                  <td>{e.product_name_snapshot ?? <span className="text-muted">{e.type === "contact" ? "General enquiry" : "—"}</span>}</td>
                  <td>{countryName(e.destination_country || e.buyer_country) || "—"}</td>
                  <td>
                    <Pill tone={enquiryTone(e.status)}>{e.status}</Pill>
                  </td>
                </tr>
              ))}
              {!recent.data?.length && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted">
                    No enquiries yet.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      )}

      {staff.role === "admin" && (
        <Card title="System status" description="Integrations required for a production launch." className="mt-8">
          <ul className="grid gap-2 sm:grid-cols-2">
            {health.map((h) => (
              <li key={h.label} className="flex items-center justify-between gap-4 rounded-lg bg-paper px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${h.ok ? "bg-accent" : "bg-danger"}`} aria-hidden />
                  {h.label}
                </span>
                <span className="truncate text-xs text-muted">{h.note}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
