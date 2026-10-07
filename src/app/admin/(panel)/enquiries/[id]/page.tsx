import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ENQUIRY_ROLES, hasRole, requireStaff } from "@/lib/admin/auth";
import { createSessionClient } from "@/lib/supabase/clients";
import { BUYER_TYPES, TIMELINES, countryName } from "@/lib/enquiry/options";
import { formatDateTime } from "@/lib/utils";
import { AdminHeader, Card, Field, Pill, Select, Textarea, adminButton, enquiryTone } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/action-form";
import { NoAccess } from "@/components/admin/no-access";
import { retryNotification, updateEnquiry } from "../../../_actions/enquiries";

export const metadata: Metadata = { title: "Enquiry" };

export default async function EnquiryDetailPage({ params }: PageProps<"/admin/enquiries/[id]">) {
  const staff = await requireStaff();
  if (!hasRole(staff, ENQUIRY_ROLES)) return <NoAccess />;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createSessionClient();
  const [{ data: e }, { data: events }, { data: staffList }] = await Promise.all([
    supabase.from("enquiries").select("*").eq("id", id).maybeSingle(),
    supabase.from("enquiry_events").select("*, actor:profiles(full_name, email)").eq("enquiry_id", id).order("created_at"),
    supabase.from("profiles").select("id, full_name, email, role").eq("is_active", true).order("full_name"),
  ]);
  if (!e) notFound();

  const rows: [string, React.ReactNode][] = [
    ["Type", e.type === "rfq" ? "Request for quotation" : e.type === "distributor" ? "Distributor enquiry" : "General enquiry"],
    ["Product", e.product_name_snapshot],
    ["Model", e.model_code_snapshot && <span className="font-mono">{e.model_code_snapshot}</span>],
    ["Quantity", e.quantity ? `${e.quantity} ${e.quantity_unit ?? ""}` : null],
    ["Application", e.application_other],
    ["Destination", [e.destination_city_port, countryName(e.destination_country)].filter(Boolean).join(", ")],
    ["Timeline", TIMELINES.find((t) => t.value === e.timeline)?.label ?? e.timeline],
  ];
  const contact: [string, React.ReactNode][] = [
    ["Name", e.name],
    ["Company", e.company],
    ["Email", <a key="e" href={`mailto:${e.email}?subject=${encodeURIComponent(`Re: your enquiry ${e.reference}`)}`} className="text-accent hover:underline">{e.email}</a>],
    ["Phone", e.phone && <a key="p" href={`tel:${e.phone.replace(/[^\d+]/g, "")}`} className="text-accent hover:underline">{e.phone}</a>],
    ["Country", countryName(e.buyer_country)],
    ["Buyer type", BUYER_TYPES.find((b) => b.value === e.buyer_type)?.label ?? e.buyer_type],
  ];

  return (
    <>
      <AdminHeader
        back={{ href: "/admin/enquiries", label: "Enquiries" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {e.name}
            <Pill tone={enquiryTone(e.status)}>{e.status}</Pill>
          </span>
        }
        description={
          <>
            <span className="font-mono">{e.reference}</span> · received {formatDateTime(e.created_at)}
          </>
        }
        actions={
          <a href={`mailto:${e.email}?subject=${encodeURIComponent(`Re: your enquiry ${e.reference}`)}`} className={adminButton("primary")}>
            Reply by email
          </a>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid content-start gap-6 lg:col-span-2">
          <Card title="Requirement">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {rows.filter(([, v]) => v).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-muted">{k}</dt>
                  <dd className="mt-0.5 font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            {e.message && (
              <div className="mt-5 border-t border-line pt-4">
                <p className="text-sm text-muted">Message</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{e.message}</p>
              </div>
            )}
          </Card>

          <Card title="Buyer">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {contact.filter(([, v]) => v).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-muted">{k}</dt>
                  <dd className="mt-0.5 font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card title="History">
            <ol className="grid gap-3 text-sm">
              <li className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ink" aria-hidden />
                <span>
                  Received via website <span className="text-muted">· {formatDateTime(e.created_at)}</span>
                </span>
              </li>
              {(events ?? []).map((ev) => (
                <li key={ev.id} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-line-strong" aria-hidden />
                  <span>
                    {ev.kind === "status_change" && (
                      <>
                        Status <strong>{ev.from_status}</strong> → <strong>{ev.to_status}</strong>
                      </>
                    )}
                    {ev.kind !== "status_change" && <span className="whitespace-pre-wrap">{ev.note}</span>}
                    <span className="block text-xs text-muted">
                      {(ev.actor as { full_name?: string; email?: string } | null)?.full_name ||
                        (ev.actor as { email?: string } | null)?.email ||
                        "System"}{" "}
                      · {formatDateTime(ev.created_at)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="grid content-start gap-6">
          <Card title="Update">
            <ActionForm action={updateEnquiry.bind(null, e.id)} submitLabel="Save">
              <Field label="Status" htmlFor="status">
                <Select id="status" name="status" defaultValue={e.status}>
                  {["new", "contacted", "quoted", "won", "lost", "spam"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Assigned to" htmlFor="assigned_to">
                <Select id="assigned_to" name="assigned_to" defaultValue={e.assigned_to ?? ""}>
                  <option value="">Unassigned</option>
                  {(staffList ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name || s.email}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Add an internal note" htmlFor="note">
                <Textarea id="note" name="note" rows={3} placeholder="Called buyer, sent quotation Q-123…" />
              </Field>
            </ActionForm>
          </Card>

          <Card title="Email delivery">
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-muted">Sales notification</dt>
                <dd className="mt-0.5">
                  {e.notify_sent_at ? (
                    <Pill tone="accent">sent {formatDateTime(e.notify_sent_at)}</Pill>
                  ) : (
                    <Pill tone="danger">not sent</Pill>
                  )}
                  {e.notify_error && <span className="mt-1 block text-xs text-danger">{e.notify_error}</span>}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Buyer acknowledgement</dt>
                <dd className="mt-0.5">
                  {e.ack_sent_at ? <Pill tone="accent">sent {formatDateTime(e.ack_sent_at)}</Pill> : <Pill>not sent</Pill>}
                  {e.ack_error && <span className="mt-1 block text-xs text-danger">{e.ack_error}</span>}
                </dd>
              </div>
            </dl>
            {!e.notify_sent_at && (
              <div className="mt-4 border-t border-line pt-4">
                <ActionForm action={retryNotification.bind(null, e.id)} submitLabel="Retry notification" variant="secondary" />
              </div>
            )}
          </Card>

          <Card title="Source">
            <dl className="grid gap-2 text-xs text-muted">
              {e.source_url && (
                <div>
                  <dt>Page</dt>
                  <dd className="break-all text-ink">{e.source_url}</dd>
                </div>
              )}
              {(e.utm_source || e.utm_medium || e.utm_campaign) && (
                <div>
                  <dt>Campaign</dt>
                  <dd className="text-ink">{[e.utm_source, e.utm_medium, e.utm_campaign].filter(Boolean).join(" / ")}</dd>
                </div>
              )}
              {e.product_id && (
                <div>
                  <dt>Catalogue</dt>
                  <dd>
                    <Link href={`/admin/products/${e.product_id}`} className="text-accent hover:underline">
                      Open product
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
