"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertRole, ENQUIRY_ROLES, runAction, type ActionState } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/clients";
import { serverEnv } from "@/lib/env";
import { absoluteUrl, site } from "@/lib/site";
import { notificationEmail, sendEmail } from "@/lib/enquiry/email";
import type { EnquiryStatus } from "@/lib/types";

const STATUSES = ["new", "contacted", "quoted", "won", "lost", "spam"] as const;

export async function updateEnquiry(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const { staff, supabase } = await assertRole(ENQUIRY_ROLES);
    const input = z
      .object({
        status: z.enum(STATUSES),
        assigned_to: z.string().uuid().or(z.literal("")),
        note: z.string().trim().max(4000).optional(),
      })
      .parse({
        status: formData.get("status"),
        assigned_to: formData.get("assigned_to") ?? "",
        note: formData.get("note") ?? undefined,
      });

    const { data: current, error: readErr } = await supabase
      .from("enquiries")
      .select("status, assigned_to")
      .eq("id", id)
      .single();
    if (readErr || !current) throw new Error("Enquiry not found.");

    const assigned = input.assigned_to || null;
    const events: Record<string, unknown>[] = [];
    if (current.status !== input.status) {
      events.push({ enquiry_id: id, actor_id: staff.id, kind: "status_change", from_status: current.status, to_status: input.status });
    }
    if (current.assigned_to !== assigned) {
      events.push({ enquiry_id: id, actor_id: staff.id, kind: "assignment", note: assigned ? `Assigned` : "Unassigned" });
    }
    if (input.note) events.push({ enquiry_id: id, actor_id: staff.id, kind: "note", note: input.note });

    if (current.status !== input.status || current.assigned_to !== assigned) {
      const { error } = await supabase
        .from("enquiries")
        .update({ status: input.status as EnquiryStatus, assigned_to: assigned })
        .eq("id", id);
      if (error) throw new Error(error.message);
    }
    if (events.length) {
      const { error } = await supabase.from("enquiry_events").insert(events);
      if (error) throw new Error(error.message);
    }
    revalidatePath(`/admin/enquiries/${id}`);
    revalidatePath("/admin/enquiries");
    return events.length ? "Enquiry updated" : "No changes";
  });
}

/** Re-send the sales notification for an enquiry whose email failed (blueprint §5.2). */
export async function retryNotification(id: string, _prev: ActionState): Promise<ActionState> {
  return runAction(async () => {
    const { staff, supabase } = await assertRole(ENQUIRY_ROLES);
    const { data: e, error } = await supabase.from("enquiries").select("*").eq("id", id).single();
    if (error || !e) throw new Error("Enquiry not found.");

    const service = createServiceClient();
    let recipients: string[] = [];
    if (service) {
      const { data } = await service.from("site_settings").select("value").eq("key", "notification_emails").maybeSingle();
      if (Array.isArray(data?.value)) recipients = (data.value as string[]).filter((x) => typeof x === "string" && x.includes("@"));
    }
    if (!recipients.length) recipients = serverEnv().notifyEmails.length ? serverEnv().notifyEmails : [site.contact.email];

    const msg = notificationEmail({
      ref: e.reference,
      type: e.type,
      productName: e.product_name_snapshot,
      model: e.model_code_snapshot,
      quantity: e.quantity,
      quantityUnit: e.quantity_unit,
      application: e.application_other,
      destinationCountry: e.destination_country,
      destinationCityPort: e.destination_city_port,
      timeline: e.timeline,
      name: e.name,
      company: e.company,
      email: e.email,
      phone: e.phone,
      buyerCountry: e.buyer_country,
      buyerType: e.buyer_type,
      message: e.message,
      sourceUrl: e.source_url,
      adminUrl: absoluteUrl(`/admin/enquiries/${id}`),
    });
    const result = await sendEmail({ to: recipients, replyTo: e.email, ...msg });
    await supabase
      .from("enquiries")
      .update(result.ok ? { notify_sent_at: new Date().toISOString(), notify_error: null } : { notify_error: result.error })
      .eq("id", id);
    await supabase.from("enquiry_events").insert({
      enquiry_id: id,
      actor_id: staff.id,
      kind: "email",
      note: result.ok ? `Notification re-sent to ${recipients.join(", ")}` : `Retry failed: ${result.error}`,
    });
    revalidatePath(`/admin/enquiries/${id}`);
    if (!result.ok) throw new Error(result.error);
    return "Notification sent";
  });
}
