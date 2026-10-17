"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertRole, ENQUIRY_ROLES, runAction, type ActionState } from "@/lib/admin/auth";
import { sendEmail } from "@/lib/enquiry/email";
import { serverEnv } from "@/lib/env";
import { site } from "@/lib/site";
import { CURRENCIES, makeReference, PRIORITIES, SOURCES, statusLabel } from "@/lib/admin/leads";
import { istInputToIso } from "@/lib/admin/dates";

const STATUSES = ["new", "contacted", "quoted", "won", "lost", "spam"] as const;
const PRIORITY_VALUES = PRIORITIES.map((p) => p.value) as [string, ...string[]];
const SOURCE_VALUES = SOURCES.map((s) => s.value) as unknown as [string, ...string[]];
const uuid = z.string().uuid();

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const tagsFrom = (v: string) =>
  [...new Set(v.split(",").map((t) => t.trim().toLowerCase().replace(/[^a-z0-9 \-]/g, "").slice(0, 30)).filter(Boolean))].slice(0, 12);

function refresh(id?: string) {
  revalidatePath("/admin/enquiries", "layout");
  if (id) revalidatePath(`/admin/enquiries/${id}`);
  revalidatePath("/admin");
}

/** Priority, follow-up, value, tags, source and lost reason. */
export async function updateLeadDetails(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const { staff, supabase } = await assertRole(ENQUIRY_ROLES);
    const v = z
      .object({
        priority: z.enum(PRIORITY_VALUES),
        follow_up_at: z.string(),
        estimated_value: z.string(),
        currency: z.enum(CURRENCIES),
        tags: z.string().max(500),
        source: z.enum(SOURCE_VALUES),
        lost_reason: z.string().max(300),
      })
      .parse({
        priority: str(formData, "priority"),
        follow_up_at: str(formData, "follow_up_at"),
        estimated_value: str(formData, "estimated_value"),
        currency: str(formData, "currency") || "USD",
        tags: str(formData, "tags"),
        source: str(formData, "source") || "website",
        lost_reason: str(formData, "lost_reason"),
      });
    const value = v.estimated_value ? Number(v.estimated_value.replace(/[, ]/g, "")) : null;
    if (value !== null && (!Number.isFinite(value) || value < 0)) throw new Error("Estimated value must be a positive number.");
    const followUp = v.follow_up_at ? istInputToIso(v.follow_up_at) : null;
    if (v.follow_up_at && !followUp) throw new Error("Follow-up date is not valid.");

    const { data: cur, error: readErr } = await supabase
      .from("enquiries")
      .select("priority, follow_up_at, estimated_value, currency, tags, source, lost_reason")
      .eq("id", id)
      .single();
    if (readErr || !cur) throw new Error("Enquiry not found.");

    const next = { priority: v.priority, follow_up_at: followUp, estimated_value: value, currency: v.currency, tags: tagsFrom(v.tags), source: v.source, lost_reason: v.lost_reason || null };
    const { error } = await supabase.from("enquiries").update(next).eq("id", id);
    if (error) throw new Error(error.message);

    const events: Record<string, unknown>[] = [];
    if (cur.priority !== next.priority) events.push({ kind: "priority", note: `Priority ${cur.priority} → ${next.priority}` });
    const sameFollow = (cur.follow_up_at ? new Date(cur.follow_up_at).getTime() : null) === (followUp ? new Date(followUp).getTime() : null);
    if (!sameFollow) events.push({ kind: "follow_up", note: followUp ? `Follow-up set for ${new Date(followUp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}` : "Follow-up cleared" });
    const changed: string[] = (["estimated_value", "currency", "source", "lost_reason"] as const).filter((k) => String(cur[k] ?? "") !== String(next[k] ?? ""));
    if (JSON.stringify(cur.tags ?? []) !== JSON.stringify(next.tags)) changed.push("tags");
    if (changed.length) events.push({ kind: "update", note: `Updated ${changed.map((c) => c.replace("_", " ")).join(", ")}` });
    if (events.length) await supabase.from("enquiry_events").insert(events.map((e) => ({ ...e, enquiry_id: id, actor_id: staff.id })));
    refresh(id);
    return events.length ? "Lead details saved" : "No changes";
  });
}

type Bulk = { status?: string; priority?: string; assigned_to?: string; delete?: boolean };

/** Apply one change to many leads at once (from the list's selection bar). */
export async function bulkUpdateLeads(ids: string[], change: Bulk): Promise<ActionState> {
  return runAction(async () => {
    const { staff, supabase } = await assertRole(ENQUIRY_ROLES);
    const list = z.array(uuid).min(1).max(200).parse(ids);
    if (change.delete) {
      if (staff.role !== "admin") throw new Error("Only administrators can delete enquiries.");
      const { error } = await supabase.from("enquiries").delete().in("id", list);
      if (error) throw new Error(error.message);
      refresh();
      return `Deleted ${list.length} enquir${list.length === 1 ? "y" : "ies"}`;
    }
    const update: Record<string, unknown> = {};
    const events: Record<string, unknown>[] = [];
    if (change.status) {
      const s = z.enum(STATUSES).parse(change.status);
      const { data: cur } = await supabase.from("enquiries").select("id, status").in("id", list);
      update.status = s;
      for (const r of cur ?? []) if (r.status !== s) events.push({ enquiry_id: r.id, kind: "status_change", from_status: r.status, to_status: s });
    }
    if (change.priority) {
      update.priority = z.enum(PRIORITY_VALUES).parse(change.priority);
      list.forEach((id) => events.push({ enquiry_id: id, kind: "priority", note: `Priority set to ${update.priority}` }));
    }
    if (change.assigned_to !== undefined) {
      update.assigned_to = change.assigned_to ? uuid.parse(change.assigned_to) : null;
      list.forEach((id) => events.push({ enquiry_id: id, kind: "assignment", note: change.assigned_to ? "Assigned" : "Unassigned" }));
    }
    if (!Object.keys(update).length) throw new Error("Nothing to change.");
    const { error } = await supabase.from("enquiries").update(update).in("id", list);
    if (error) throw new Error(error.message);
    if (events.length) await supabase.from("enquiry_events").insert(events.map((e) => ({ ...e, actor_id: staff.id })));
    refresh();
    return `Updated ${list.length} enquir${list.length === 1 ? "y" : "ies"}`;
  });
}

/** Move a lead to another pipeline stage (drag and drop on the board). */
export async function moveLead(id: string, status: string): Promise<ActionState> {
  return runAction(async () => {
    const { staff, supabase } = await assertRole(ENQUIRY_ROLES);
    const s = z.enum(STATUSES).parse(status);
    const { data: cur, error: readErr } = await supabase.from("enquiries").select("status").eq("id", uuid.parse(id)).single();
    if (readErr || !cur) throw new Error("Enquiry not found.");
    if (cur.status === s) return "No change";
    const { error } = await supabase.from("enquiries").update({ status: s }).eq("id", id);
    if (error) throw new Error(error.message);
    await supabase.from("enquiry_events").insert({ enquiry_id: id, actor_id: staff.id, kind: "status_change", from_status: cur.status, to_status: s });
    refresh(id);
    return `Moved to ${statusLabel(s)}`;
  });
}

/** A lead taken by phone, email, WhatsApp or at a trade show. */
export async function createLead(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let newId = "";
  const result = await runAction(async () => {
    const { staff, supabase } = await assertRole(ENQUIRY_ROLES);
    const v = z
      .object({
        type: z.enum(["rfq", "contact", "distributor"]),
        name: z.string().min(2, "Enter the buyer's name.").max(120),
        company: z.string().max(160),
        email: z.string().email("Enter a valid email address.").max(200),
        phone: z.string().max(40),
        buyer_country: z.string().max(2),
        product: z.string().max(200),
        model: z.string().max(60),
        quantity: z.string().max(10),
        quantity_unit: z.string().max(20),
        destination_country: z.string().max(2),
        message: z.string().max(5000),
        source: z.enum(SOURCE_VALUES),
        priority: z.enum(PRIORITY_VALUES),
        estimated_value: z.string().max(20),
        currency: z.enum(CURRENCIES),
        follow_up_at: z.string(),
        assigned_to: z.string(),
        tags: z.string().max(500),
      })
      .parse(Object.fromEntries(["type", "name", "company", "email", "phone", "buyer_country", "product", "model", "quantity", "quantity_unit", "destination_country", "message", "source", "priority", "estimated_value", "currency", "follow_up_at", "assigned_to", "tags"].map((k) => [k, str(formData, k)])));
    const qty = v.quantity ? Number(v.quantity) : null;
    if (qty !== null && (!Number.isInteger(qty) || qty <= 0)) throw new Error("Quantity must be a whole number.");
    const value = v.estimated_value ? Number(v.estimated_value.replace(/[, ]/g, "")) : null;
    if (value !== null && (!Number.isFinite(value) || value < 0)) throw new Error("Estimated value must be a positive number.");

    const { data, error } = await supabase
      .from("enquiries")
      .insert({
        reference: makeReference(),
        type: v.type,
        status: "new",
        name: v.name,
        company: v.company || null,
        email: v.email,
        phone: v.phone || null,
        buyer_country: v.buyer_country || null,
        product_name_snapshot: v.product || null,
        model_code_snapshot: v.model || null,
        quantity: qty,
        quantity_unit: qty ? v.quantity_unit || "units" : null,
        destination_country: v.destination_country || null,
        message: v.message || null,
        consent: false,
        source: v.source,
        priority: v.priority,
        estimated_value: value,
        currency: v.currency,
        follow_up_at: v.follow_up_at ? istInputToIso(v.follow_up_at) : null,
        assigned_to: v.assigned_to ? uuid.parse(v.assigned_to) : staff.id,
        tags: tagsFrom(v.tags),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    newId = data.id;
    await supabase.from("enquiry_events").insert({ enquiry_id: newId, actor_id: staff.id, kind: "created", note: `Added by hand (${v.source})` });
    refresh(newId);
  });
  if (result.ok && newId) redirect(`/admin/enquiries/${newId}`);
  return result;
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Email the buyer from the admin; replies go to the staff member's own inbox. */
export async function emailLead(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const { staff, supabase } = await assertRole(ENQUIRY_ROLES);
    if (!serverEnv().resendApiKey) throw new Error("Email sending is not configured (RESEND_API_KEY).");
    const v = z
      .object({ subject: z.string().min(2, "Add a subject.").max(200), body: z.string().min(2, "Write a message.").max(10000) })
      .parse({ subject: str(formData, "subject"), body: str(formData, "body") });
    const { data: e, error } = await supabase.from("enquiries").select("email, name, status, reference").eq("id", id).single();
    if (error || !e) throw new Error("Enquiry not found.");
    const signature = `\n\n—\n${staff.full_name || site.name}\n${site.legalName}\n${site.url.replace(/^https?:\/\//, "")}`;
    const text = `${v.body}${signature}`;
    const html = `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#072768">${escapeHtml(text).replace(/\n/g, "<br>")}</div>`;
    const sent = await sendEmail({ to: [e.email], subject: v.subject, text, html, replyTo: staff.email });
    await supabase.from("enquiry_events").insert({
      enquiry_id: id,
      actor_id: staff.id,
      kind: "email",
      note: sent.ok ? `Emailed “${v.subject}”\n\n${v.body}` : `Email failed: ${sent.error}`,
    });
    if (!sent.ok) {
      refresh(id);
      throw new Error(sent.error);
    }
    if (e.status === "new") {
      await supabase.from("enquiries").update({ status: "contacted" }).eq("id", id);
      await supabase.from("enquiry_events").insert({ enquiry_id: id, actor_id: staff.id, kind: "status_change", from_status: "new", to_status: "contacted" });
    }
    refresh(id);
    return `Email sent to ${e.email}`;
  });
}

/** Record a phone call or meeting. */
export async function logCall(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const { staff, supabase } = await assertRole(ENQUIRY_ROLES);
    const note = z.string().trim().min(2, "Add a short summary.").max(4000).parse(str(formData, "summary"));
    const outcome = str(formData, "outcome");
    const { error } = await supabase.from("enquiry_events").insert({ enquiry_id: id, actor_id: staff.id, kind: "call", note: outcome ? `${outcome}: ${note}` : note });
    if (error) throw new Error(error.message);
    refresh(id);
    return "Call logged";
  });
}
