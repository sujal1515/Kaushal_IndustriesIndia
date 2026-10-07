import "server-only";
import { serverEnv } from "@/lib/env";
import { absoluteUrl, site } from "@/lib/site";
import { countryName, TIMELINES, BUYER_TYPES } from "./options";

export type EmailResult = { ok: true } | { ok: false; error: string };

const esc = (s: string | number | null | undefined) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Transactional email through Resend's HTTP API (blueprint §8.5 recommendation). */
export async function sendEmail(msg: {
  to: string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<EmailResult> {
  const env = serverEnv();
  if (!env.resendApiKey) return { ok: false, error: "Email provider not configured (RESEND_API_KEY missing)" };
  if (!msg.to.length) return { ok: false, error: "No recipients configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.emailFrom,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { ok: false, error: `Resend ${res.status}: ${(await res.text()).slice(0, 300)}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown email error" };
  }
}

export interface EnquiryEmailData {
  ref: string;
  type: "rfq" | "contact" | "distributor";
  productName?: string | null;
  productUrl?: string | null;
  model?: string | null;
  quantity?: number | null;
  quantityUnit?: string | null;
  application?: string | null;
  destinationCountry?: string | null;
  destinationCityPort?: string | null;
  timeline?: string | null;
  name: string;
  company?: string | null;
  email: string;
  phone?: string | null;
  buyerCountry?: string | null;
  buyerType?: string | null;
  message?: string | null;
  sourceUrl?: string | null;
  adminUrl?: string | null;
}

const TYPE_LABEL = { rfq: "Request for quotation", contact: "Website enquiry", distributor: "Distributor enquiry" };

function rows(d: EnquiryEmailData): [string, string][] {
  const timeline = TIMELINES.find((t) => t.value === d.timeline)?.label ?? d.timeline;
  const buyerType = BUYER_TYPES.find((b) => b.value === d.buyerType)?.label ?? d.buyerType;
  const r: [string, string | null | undefined][] = [
    ["Product", d.productName],
    ["Model", d.model],
    ["Quantity", d.quantity ? `${d.quantity} ${d.quantityUnit ?? ""}`.trim() : null],
    ["Application", d.application],
    ["Destination", [d.destinationCityPort, countryName(d.destinationCountry)].filter(Boolean).join(", ")],
    ["Timeline", timeline],
    ["Name", d.name],
    ["Company", d.company],
    ["Email", d.email],
    ["Phone", d.phone],
    ["Buyer country", countryName(d.buyerCountry)],
    ["Buyer type", buyerType],
  ];
  return r.filter((x): x is [string, string] => !!x[1]);
}

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f7efe8;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#072768">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #eadfd3;border-radius:12px">
<tr><td style="padding:28px 32px 8px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#575d73">${esc(site.name)}</td></tr>
<tr><td style="padding:0 32px 8px;font-size:22px;font-weight:600;letter-spacing:-.02em">${esc(title)}</td></tr>
<tr><td style="padding:8px 32px 32px;font-size:15px;line-height:1.6">${body}</td></tr>
</table></td></tr></table></body></html>`;
}

function table(d: EnquiryEmailData) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eadfd3;margin-top:16px">${rows(d)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid #eadfd3;color:#575d73;width:38%;vertical-align:top">${esc(k)}</td><td style="padding:10px 0;border-bottom:1px solid #eadfd3;vertical-align:top">${esc(v)}</td></tr>`,
    )
    .join("")}</table>`;
}

export function notificationEmail(d: EnquiryEmailData) {
  const subject = `[${d.ref}] ${TYPE_LABEL[d.type]}${d.productName ? ` — ${d.productName}${d.model ? ` ${d.model}` : ""}` : ""}${
    d.destinationCountry || d.buyerCountry ? ` — ${countryName(d.destinationCountry || d.buyerCountry)}` : ""
  }`;
  const html = layout(
    `New ${TYPE_LABEL[d.type].toLowerCase()}`,
    `<p style="margin:0">Reference <strong>${esc(d.ref)}</strong>. Reply to this email to respond to the buyer directly.</p>
${table(d)}
${d.message ? `<p style="margin:20px 0 4px;color:#575d73">Message</p><p style="margin:0;white-space:pre-wrap">${esc(d.message)}</p>` : ""}
${d.productUrl ? `<p style="margin:20px 0 0"><a href="${esc(d.productUrl)}" style="color:#84603f">View product page</a></p>` : ""}
${d.adminUrl ? `<p style="margin:8px 0 0"><a href="${esc(d.adminUrl)}" style="color:#84603f">Open in admin</a></p>` : ""}
${d.sourceUrl ? `<p style="margin:20px 0 0;font-size:12px;color:#575d73">Submitted from ${esc(d.sourceUrl)}</p>` : ""}`,
  );
  const text = [
    `New ${TYPE_LABEL[d.type]} — ${d.ref}`,
    "",
    ...rows(d).map(([k, v]) => `${k}: ${v}`),
    d.message ? `\nMessage:\n${d.message}` : "",
    d.adminUrl ? `\nAdmin: ${d.adminUrl}` : "",
  ].join("\n");
  return { subject, html, text };
}

export function acknowledgementEmail(d: EnquiryEmailData) {
  const subject = `We received your ${d.type === "rfq" ? "quotation request" : "enquiry"} — ${site.name} (${d.ref})`;
  const html = layout(
    "Thank you — we have your enquiry",
    `<p style="margin:0">Dear ${esc(d.name)},</p>
<p>Thank you for contacting ${esc(site.name)}. Our sales team will review your ${d.type === "rfq" ? "requirement" : "message"} and reply to you by email. Your reference is <strong>${esc(d.ref)}</strong>.</p>
<p style="margin:0">A copy of what you sent:</p>
${table(d)}
${d.message ? `<p style="margin:20px 0 4px;color:#575d73">Your message</p><p style="margin:0;white-space:pre-wrap">${esc(d.message)}</p>` : ""}
<p style="margin:24px 0 0">Regards,<br>${esc(site.name)}<br><a href="${esc(absoluteUrl("/"))}" style="color:#84603f">${esc(site.url.replace(/^https?:\/\//, ""))}</a></p>`,
  );
  const text = [
    `Dear ${d.name},`,
    "",
    `Thank you for contacting ${site.name}. Our sales team will reply to you by email. Your reference is ${d.ref}.`,
    "",
    ...rows(d).map(([k, v]) => `${k}: ${v}`),
    d.message ? `\nYour message:\n${d.message}` : "",
    "",
    `Regards,\n${site.name}\n${site.url}`,
  ].join("\n");
  return { subject, html, text };
}
