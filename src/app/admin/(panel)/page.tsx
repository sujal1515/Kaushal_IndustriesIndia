import Link from "next/link";
import type { Metadata } from "next";
import { CATALOGUE_ROLES, ENQUIRY_ROLES, hasRole, requireStaff } from "@/lib/admin/auth";
import { createSessionClient } from "@/lib/supabase/clients";
import { publicEnv, serverEnv } from "@/lib/env";
import { cmsPages, isPageKey } from "@/lib/cms/pages";
import { istDayBounds } from "@/lib/admin/dates";
import { LEAD_STATUSES, OPEN_STATUSES, formatMoney, sourceLabel, statusLabel } from "@/lib/admin/leads";
import { countryName } from "@/lib/enquiry/options";
import { cn, formatDateTime } from "@/lib/utils";
import { AdminHeader, Card, Pill, enquiryTone } from "@/components/admin/ui";
import { MonthBars, RankBars } from "@/components/admin/charts";

export const metadata: Metadata = { title: "Dashboard" };

type Lead = {
  id: string;
  created_at: string;
  status: string;
  name: string;
  company: string | null;
  source: string;
  destination_country: string | null;
  buyer_country: string | null;
  product_name_snapshot: string | null;
  estimated_value: number | null;
  currency: string;
  assigned_to: string | null;
  follow_up_at: string | null;
  notify_error: string | null;
};

const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
const top = (counts: Map<string, number>, n = 6) =>
  [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, value]) => ({ label, value }));
const tally = <T,>(items: T[], key: (x: T) => string | null | undefined) => {
  const m = new Map<string, number>();
  items.forEach((x) => {
    const k = key(x);
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  });
  return m;
};

function Stat({ label, value, note, href, tone }: { label: string; value: React.ReactNode; note?: React.ReactNode; href: string; tone?: "danger" | "accent" }) {
  return (
    <Link href={href} className="rounded-xl border border-line bg-surface p-5 transition-colors hover:border-ink/30">
      <p className="text-sm text-muted">{label}</p>
      <p className={cn("mt-2 text-3xl font-semibold tracking-[-0.03em] tabular-nums", tone === "danger" && "text-danger")}>{value}</p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </Link>
  );
}

export default async function DashboardPage() {
  const staff = await requireStaff();
  const supabase = await createSessionClient();
  const canLeads = hasRole(staff, ENQUIRY_ROLES);
  const canContent = hasRole(staff, CATALOGUE_ROLES);

  const now = new Date();
  const yearAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const today = istDayBounds();

  const [leadsRes, eventsRes, peopleRes, products, models, drafts, media, resources] = await Promise.all([
    canLeads
      ? supabase
          .from("enquiries")
          .select("id, created_at, status, name, company, source, destination_country, buyer_country, product_name_snapshot, estimated_value, currency, assigned_to, follow_up_at, notify_error")
          .neq("status", "spam")
          .gte("created_at", yearAgo.toISOString())
          .order("created_at", { ascending: false })
          .limit(5000)
      : null,
    canLeads
      ? supabase.from("enquiry_events").select("id, kind, note, to_status, created_at, enquiry_id, actor:profiles(full_name, email), enquiry:enquiries(name)").order("created_at", { ascending: false }).limit(8)
      : null,
    supabase.from("profiles").select("id, full_name, email"),
    canContent ? supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "published") : null,
    canContent ? supabase.from("product_models").select("id", { count: "exact", head: true }) : null,
    canContent ? supabase.from("cms_drafts").select("key, updated_at") : null,
    canContent ? supabase.from("media_assets").select("id", { count: "exact", head: true }) : null,
    canContent ? supabase.from("resources").select("id", { count: "exact", head: true }).eq("is_published", true) : null,
  ]);

  const leads = ((leadsRes?.data ?? []) as Lead[]).map((l) => ({ ...l, estimated_value: l.estimated_value === null ? null : Number(l.estimated_value) }));
  const names = new Map((peopleRes.data ?? []).map((p) => [p.id as string, (p.full_name || p.email) as string]));

  // Headline figures
  const thisMonth = leads.filter((l) => monthKey(new Date(l.created_at)) === monthKey(now)).length;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = leads.filter((l) => monthKey(new Date(l.created_at)) === monthKey(lastMonthDate)).length;
  const change = lastMonth ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;
  const open = leads.filter((l) => OPEN_STATUSES.includes(l.status as never));
  const openUsd = open.reduce((s, l) => s + (l.currency === "USD" && l.estimated_value ? l.estimated_value : 0), 0);
  const won = leads.filter((l) => l.status === "won").length;
  const lost = leads.filter((l) => l.status === "lost").length;
  const winRate = won + lost ? Math.round((won / (won + lost)) * 100) : null;
  const t = (iso: string) => new Date(iso).getTime();
  const dueOpen = open.filter((l) => l.follow_up_at && t(l.follow_up_at) <= t(today.end));
  const overdue = dueOpen.filter((l) => t(l.follow_up_at!) < t(today.start));
  const myDue = dueOpen.filter((l) => l.assigned_to === staff.id).sort((a, b) => t(a.follow_up_at!) - t(b.follow_up_at!));
  const newCount = leads.filter((l) => l.status === "new").length;
  const failed = leads.filter((l) => l.notify_error).length;

  // Charts
  const months = Array.from({ length: 12 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 11 + i, 1));
  const monthly = months.map((m) => {
    const inMonth = leads.filter((l) => monthKey(new Date(l.created_at)) === monthKey(m));
    return { label: m.toLocaleString("en-IN", { month: "short" }), total: inMonth.length, won: inMonth.filter((l) => l.status === "won").length };
  });
  const byStage = LEAD_STATUSES.filter((s) => s.value !== "spam").map((s) => ({ label: s.label, value: leads.filter((l) => l.status === s.value).length }));
  const byCountry = top(tally(leads, (l) => countryName(l.destination_country || l.buyer_country)));
  const byProduct = top(tally(leads, (l) => l.product_name_snapshot));
  const bySource = top(tally(leads, (l) => sourceLabel(l.source)));

  const env = serverEnv();
  const health = [
    { label: "Supabase", ok: true, note: "Connected" },
    { label: "Service role key", ok: !!env.supabaseServiceKey, note: env.supabaseServiceKey ? "Website enquiries can be saved" : "Missing — website enquiries cannot be stored" },
    { label: "Email (Resend)", ok: !!env.resendApiKey, note: env.resendApiKey ? "Notifications and lead emails on" : "Missing — no email" },
    { label: "Turnstile", ok: !!(publicEnv.turnstileSiteKey && env.turnstileSecret), note: publicEnv.turnstileSiteKey ? "Bot check on" : "Off — honeypot + rate limit only" },
    { label: "Google Tag Manager", ok: !!publicEnv.gtmId, note: publicEnv.gtmId || "Not configured" },
  ];

  return (
    <>
      <AdminHeader
        title={`Welcome${staff.full_name ? `, ${staff.full_name.split(" ")[0]}` : ""}`}
        description={canLeads ? "Leads, follow-ups and content at a glance — figures cover the last 12 months, excluding spam." : "Content and catalogue at a glance."}
      />

      {canLeads && (
        <>
          {failed > 0 && (
            <Link href="/admin/enquiries?notify=failed" className="mb-6 block rounded-xl border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
              {failed} enquir{failed === 1 ? "y" : "ies"} could not be emailed to the sales inbox. The leads are saved — review them here.
            </Link>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="New, unanswered" value={newCount} href="/admin/enquiries?status=new" tone={newCount ? "danger" : undefined} />
            <Stat
              label="This month"
              value={thisMonth}
              note={change === null ? `${lastMonth} last month` : `${change >= 0 ? "▲" : "▼"} ${Math.abs(change)}% vs last month`}
              href="/admin/enquiries"
            />
            <Stat label="Open pipeline" value={open.length} note={openUsd ? `${formatMoney(openUsd, "USD")} estimated in USD leads` : "Leads not yet won or lost"} href="/admin/enquiries/board" />
            <Stat label="Win rate" value={winRate === null ? "—" : `${winRate}%`} note={`${won} won · ${lost} lost`} href="/admin/enquiries?status=won" />
            <Stat label="Follow-ups due" value={dueOpen.length} note={overdue.length ? `${overdue.length} overdue` : "Nothing overdue"} href="/admin/enquiries/follow-ups?owner=all" tone={overdue.length ? "danger" : undefined} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card title="Enquiries per month" className="lg:col-span-2">
              <MonthBars data={monthly} />
            </Card>
            <Card title="Pipeline by stage" actions={<Link href="/admin/enquiries/board" className="text-sm text-accent">Board →</Link>}>
              <RankBars data={byStage} tone="bg-ink" />
            </Card>
            <Card title="Top destinations">
              <RankBars data={byCountry} empty="No countries recorded yet." />
            </Card>
            <Card title="Most requested products">
              <RankBars data={byProduct} empty="No products recorded yet." tone="bg-steel" />
            </Card>
            <Card title="Lead sources">
              <RankBars data={bySource} tone="bg-ink-soft" />
            </Card>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card title="Your follow-ups" actions={<Link href="/admin/enquiries/follow-ups" className="text-sm text-accent">All →</Link>}>
              {myDue.length ? (
                <ul className="grid gap-2 text-sm">
                  {myDue.slice(0, 6).map((l) => (
                    <li key={l.id}>
                      <Link href={`/admin/enquiries/${l.id}`} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-paper">
                        <span className="truncate font-medium">
                          {l.name}
                          {l.company && <span className="font-normal text-muted"> · {l.company}</span>}
                        </span>
                        <span className={cn("shrink-0 text-xs", t(l.follow_up_at!) < t(today.start) ? "font-medium text-danger" : "text-muted")}>{formatDateTime(l.follow_up_at)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-sm text-muted">Nothing due today. Set follow-up dates on leads to see them here.</p>
              )}
            </Card>
            <Card title="Recent activity">
              {eventsRes?.data?.length ? (
                <ul className="grid gap-2.5 text-sm">
                  {eventsRes.data.map((ev) => {
                    const actor = (Array.isArray(ev.actor) ? ev.actor[0] : ev.actor) as { full_name?: string; email?: string } | null;
                    const enquiry = (Array.isArray(ev.enquiry) ? ev.enquiry[0] : ev.enquiry) as { name?: string } | null;
                    const what = ev.kind === "status_change" ? `moved to ${statusLabel(ev.to_status ?? "")}` : ev.kind === "call" ? "logged a call" : ev.kind === "email" ? "sent an email" : ev.kind === "note" ? "added a note" : ev.kind === "created" ? "added the lead" : `updated ${ev.kind.replace("_", "-")}`;
                    return (
                      <li key={ev.id} className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bronze" aria-hidden />
                        <span className="min-w-0">
                          <span className="font-medium">{actor?.full_name || actor?.email || "Someone"}</span> {what} ·{" "}
                          <Link href={`/admin/enquiries/${ev.enquiry_id}`} className="text-accent hover:underline">
                            {enquiry?.name ?? "lead"}
                          </Link>
                          <span className="block text-xs text-muted">{formatDateTime(ev.created_at)}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="py-4 text-sm text-muted">No activity yet.</p>
              )}
            </Card>
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Latest enquiries</h2>
              <Link href="/admin/enquiries" className="text-sm text-accent">
                View all →
              </Link>
            </div>
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
              {leads.slice(0, 6).map((l) => (
                <li key={l.id}>
                  <Link href={`/admin/enquiries/${l.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm hover:bg-paper">
                    <span className="w-36 shrink-0 text-xs text-muted">{formatDateTime(l.created_at)}</span>
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium">{l.name}</span>
                      {l.product_name_snapshot && <span className="text-muted"> · {l.product_name_snapshot}</span>}
                    </span>
                    <span className="text-xs text-muted">{countryName(l.destination_country || l.buyer_country) || "—"}</span>
                    <span className="text-xs text-muted">{l.assigned_to ? names.get(l.assigned_to) : "Unassigned"}</span>
                    <Pill tone={enquiryTone(l.status)}>{statusLabel(l.status)}</Pill>
                  </Link>
                </li>
              ))}
              {!leads.length && <li className="px-5 py-8 text-center text-sm text-muted">No enquiries yet.</li>}
            </ul>
          </div>
        </>
      )}

      {canContent && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card title="Content" actions={<Link href="/admin/content" className="text-sm text-accent">Pages →</Link>}>
            {drafts?.data?.length ? (
              <>
                <p className="mb-3 text-sm text-muted">Drafts waiting to be published:</p>
                <ul className="grid gap-1.5 text-sm">
                  {drafts.data.map((d) => (
                    <li key={d.key}>
                      <Link href={`/admin/content/${d.key}`} className="flex justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-paper">
                        <span className="font-medium">{isPageKey(d.key) ? cmsPages[d.key].label : d.key}</span>
                        <span className="text-xs text-muted">{formatDateTime(d.updated_at)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-muted">Every page is published — no drafts pending.</p>
            )}
          </Card>
          <Card title="Catalogue">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              {[
                { label: "Published products", value: products?.count ?? 0, href: "/admin/products" },
                { label: "Models", value: models?.count ?? 0, href: "/admin/products" },
                { label: "Published documents", value: resources?.count ?? 0, href: "/admin/resources" },
                { label: "Media files", value: media?.count ?? 0, href: "/admin/media" },
              ].map((s) => (
                <Link key={s.label} href={s.href} className="rounded-lg bg-paper px-3 py-2.5 hover:bg-ink/[0.04]">
                  <dt className="text-xs text-muted">{s.label}</dt>
                  <dd className="text-xl font-semibold tabular-nums">{s.value}</dd>
                </Link>
              ))}
            </dl>
          </Card>
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
