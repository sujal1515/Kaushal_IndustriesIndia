"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCatalogue } from "@/lib/data/catalogue";
import { createServiceClient } from "@/lib/supabase/clients";
import { serverEnv } from "@/lib/env";
import { absoluteUrl, site } from "@/lib/site";
import { enquirySchema, requiredFieldErrors, type EnquiryFormState } from "@/lib/enquiry/schema";
import { acknowledgementEmail, notificationEmail, sendEmail, type EnquiryEmailData } from "@/lib/enquiry/email";
import { MIN_FILL_MS, RATE_LIMIT, clientIp, hashIp, verifyTurnstile } from "@/lib/enquiry/spam";

const FIELDS = [
  "type", "product", "model", "quantity", "quantity_unit", "application", "application_other",
  "destination_country", "destination_city_port", "timeline", "name", "company", "email", "phone",
  "buyer_country", "buyer_type", "message", "consent",
] as const;

function makeRef() {
  // Short, human-friendly reference: KI-YYMMDD-XXXX
  const d = new Date();
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  return `KI-${ymd}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

/**
 * RFQ / contact submission (blueprint §5.2):
 * validate → spam checks → save to Supabase FIRST → notify client → acknowledge buyer
 * → record email outcome → redirect to thank-you.
 */
export async function submitEnquiry(_prev: EnquiryFormState, formData: FormData): Promise<EnquiryFormState> {
  const raw: Record<string, string> = {};
  for (const f of FIELDS) {
    const v = formData.get(f);
    if (typeof v === "string") raw[f] = v;
  }
  const values = { ...raw };
  delete values.consent;

  const type = raw.type === "contact" || raw.type === "distributor" ? raw.type : "rfq";
  const thankYou = (ref: string) => `/request-a-quote/thank-you?type=${type}&ref=${encodeURIComponent(ref)}`;

  // 1. Silent spam traps: honeypot and too-fast submissions get a normal-looking success.
  const honeypot = String(formData.get("website") ?? "");
  const startedAt = Number(formData.get("started_at") ?? 0);
  if (honeypot || (startedAt && Date.now() - startedAt < MIN_FILL_MS)) {
    redirect(thankYou(makeRef()));
  }

  // 2. Validation (same schema the client mirrors).
  const parsed = enquirySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check the highlighted fields.",
      // Report base-field errors and type-specific missing fields together.
      fieldErrors: { ...requiredFieldErrors({ ...raw, type }), ...z.flattenError(parsed.error).fieldErrors },
      values,
    };
  }
  const input = parsed.data;

  // 3. Bot check + rate limit.
  const h = await headers();
  const ip = clientIp(h);
  const ipHash = hashIp(ip);
  if (!(await verifyTurnstile(String(formData.get("cf-turnstile-response") ?? ""), ip))) {
    return { status: "error", message: "We couldn't verify you're human. Please try the check again.", values };
  }

  const db = createServiceClient();
  const env = serverEnv();
  const emailReady = Boolean(env.resendApiKey);
  if (!db && !emailReady && process.env.NODE_ENV === "production") {
    console.error("[enquiry] Neither Supabase nor the email provider is configured — enquiry cannot be delivered.");
    return {
      status: "error",
      message: `Our enquiry service is temporarily unavailable. Please email ${site.contact.email} or call ${site.contact.phones[0]}.`,
      values,
    };
  }

  if (db) {
    const since = new Date(Date.now() - RATE_LIMIT.windowMinutes * 60_000).toISOString();
    const { count } = await db
      .from("enquiries")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since);
    if ((count ?? 0) >= RATE_LIMIT.max) {
      return { status: "error", message: "You've sent several enquiries in a short time. Please wait a few minutes and try again.", values };
    }
  }

  // 4. Resolve product / model / application against the live catalogue.
  const catalogue = await getCatalogue();
  const product = input.product ? catalogue.products.find((p) => p.slug === input.product) : undefined;
  const category = product ? catalogue.categories.find((c) => c.id === product.category_id) : undefined;
  const model = product && input.model ? catalogue.models.find((m) => m.product_id === product.id && m.model_code === input.model) : undefined;
  const application = input.application ? catalogue.applications.find((a) => a.slug === input.application) : undefined;
  const fkSafe = catalogue.source === "supabase"; // seed ids are slugs, not UUIDs

  const ref = makeRef();
  const sourceUrl = h.get("referer");
  let utm: Record<string, string | null> = { utm_source: null, utm_medium: null, utm_campaign: null };
  try {
    if (sourceUrl) {
      const u = new URL(sourceUrl);
      utm = {
        utm_source: u.searchParams.get("utm_source"),
        utm_medium: u.searchParams.get("utm_medium"),
        utm_campaign: u.searchParams.get("utm_campaign"),
      };
    }
  } catch {
    /* ignore malformed referer */
  }

  const record = {
    reference: ref,
    type: input.type,
    product_id: fkSafe ? (product?.id ?? null) : null,
    model_id: fkSafe ? (model?.id ?? null) : null,
    product_name_snapshot: product?.name ?? (input.product || null),
    model_code_snapshot: model?.model_code ?? (input.model || null),
    quantity: input.quantity ?? null,
    quantity_unit: input.quantity ? (input.quantity_unit ?? "units") : null,
    application_id: fkSafe ? (application?.id ?? null) : null,
    application_other: input.application === "other" ? (input.application_other ?? null) : (application?.name ?? null),
    destination_country: input.destination_country || null,
    destination_city_port: input.destination_city_port ?? null,
    timeline: input.timeline || null,
    name: input.name,
    company: input.company ?? null,
    email: input.email.toLowerCase(),
    phone: input.phone || null,
    buyer_country: input.buyer_country || null,
    buyer_type: input.buyer_type || null,
    message: input.message ?? null,
    consent: true,
    source_url: sourceUrl,
    referrer: h.get("x-original-referrer"),
    ...utm,
    ip_hash: ipHash,
    user_agent: h.get("user-agent")?.slice(0, 400) ?? null,
  };

  // 5. Save FIRST — a lead must never be lost because email failed.
  let enquiryId: string | null = null;
  if (db) {
    const { data, error } = await db.from("enquiries").insert(record).select("id").single();
    if (error) {
      console.error("[enquiry] insert failed", error.message);
      if (!emailReady) {
        return {
          status: "error",
          message: `Sorry, we couldn't save your enquiry. Please try again or email ${site.contact.email}.`,
          values,
        };
      }
    } else {
      enquiryId = data.id as string;
    }
  } else {
    console.warn(`[enquiry] Supabase not configured — ${ref} not stored.`, process.env.NODE_ENV !== "production" ? record : "");
  }

  // 6. Notify the client and acknowledge the buyer.
  // Notification recipients are private (not readable by anon), so read them with the service client.
  let configured: string[] = [];
  if (db) {
    const { data } = await db.from("site_settings").select("value").eq("key", "notification_emails").maybeSingle();
    if (Array.isArray(data?.value)) configured = (data.value as unknown[]).filter((x): x is string => typeof x === "string" && x.includes("@"));
  }
  const recipients = configured.length ? configured : env.notifyEmails.length ? env.notifyEmails : [site.contact.email];

  const emailData: EnquiryEmailData = {
    ref,
    type: input.type,
    productName: record.product_name_snapshot,
    productUrl: product && category ? absoluteUrl(`/products/${category.slug}/${product.slug}`) : null,
    model: record.model_code_snapshot,
    quantity: record.quantity,
    quantityUnit: record.quantity_unit,
    application: record.application_other,
    destinationCountry: record.destination_country,
    destinationCityPort: record.destination_city_port,
    timeline: record.timeline,
    name: record.name,
    company: record.company,
    email: record.email,
    phone: record.phone,
    buyerCountry: record.buyer_country,
    buyerType: record.buyer_type,
    message: record.message,
    sourceUrl,
    adminUrl: enquiryId ? absoluteUrl(`/admin/enquiries/${enquiryId}`) : null,
  };

  if (emailReady) {
    const n = notificationEmail(emailData);
    const a = acknowledgementEmail(emailData);
    const [notify, ack] = await Promise.all([
      sendEmail({ to: recipients, replyTo: record.email, ...n }),
      sendEmail({ to: [record.email], replyTo: recipients[0], ...a }),
    ]);
    if (db && enquiryId) {
      const now = new Date().toISOString();
      await db
        .from("enquiries")
        .update({
          notify_sent_at: notify.ok ? now : null,
          notify_error: notify.ok ? null : notify.error,
          ack_sent_at: ack.ok ? now : null,
          ack_error: ack.ok ? null : ack.error,
        })
        .eq("id", enquiryId);
    }
    if (!notify.ok) console.error(`[enquiry] ${ref} notification failed:`, notify.error);
    if (!db && !notify.ok && process.env.NODE_ENV === "production") {
      return {
        status: "error",
        message: `Sorry, we couldn't send your enquiry. Please email ${site.contact.email} directly.`,
        values,
      };
    }
  } else if (db && enquiryId) {
    await db.from("enquiries").update({ notify_error: "Email provider not configured" }).eq("id", enquiryId);
  }

  redirect(thankYou(ref));
}
