import type { Metadata } from "next";
import { requireStaff } from "@/lib/admin/auth";
import { createSessionClient } from "@/lib/supabase/clients";
import { defaultSettings } from "@/lib/data/catalogue";
import { AdminHeader, Card, Field, Input, Textarea } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/action-form";
import { NoAccess } from "@/components/admin/no-access";
import { saveSettings } from "../../_actions/admin";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const staff = await requireStaff();
  if (staff.role !== "admin") return <NoAccess />;
  const supabase = await createSessionClient();
  const { data } = await supabase.from("site_settings").select("key, value");
  const s: Record<string, unknown> = { ...defaultSettings, ...Object.fromEntries((data ?? []).map((r) => [r.key, r.value])) };
  const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);

  return (
    <>
      <AdminHeader title="Settings" description="Enquiry routing and the contact details shown across the website." />
      <Card>
        <ActionForm action={saveSettings}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Enquiry notification emails"
              htmlFor="notification_emails"
              hint="Every RFQ and contact enquiry is emailed here. Separate addresses with commas. Never shown publicly."
              className="sm:col-span-2"
            >
              <Input id="notification_emails" name="notification_emails" defaultValue={arr(s.notification_emails).join(", ")} required />
            </Field>
            <Field label="Phone numbers" htmlFor="phones" hint="One per line, with country code. The first is the primary number.">
              <Textarea id="phones" name="phones" rows={3} defaultValue={arr(s.phones).join("\n")} />
            </Field>
            <Field label="Address" htmlFor="address_lines" hint="One line per row.">
              <Textarea id="address_lines" name="address_lines" rows={3} defaultValue={arr(s.address_lines).join("\n")} />
            </Field>
            <Field label="WhatsApp number" htmlFor="whatsapp" hint="With country code, e.g. +91 97197 01128">
              <Input id="whatsapp" name="whatsapp" defaultValue={String(s.whatsapp ?? "")} required />
            </Field>
            <Field label="Public email" htmlFor="email">
              <Input id="email" name="email" type="email" defaultValue={String(s.email ?? "")} required />
            </Field>
          </div>
        </ActionForm>
      </Card>
    </>
  );
}
