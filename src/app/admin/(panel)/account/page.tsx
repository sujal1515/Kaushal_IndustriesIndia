import type { Metadata } from "next";
import { ROLE_LABEL, requireStaff } from "@/lib/admin/auth";
import { AdminHeader, Card, Field, Input } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/action-form";
import { MfaEnroll } from "@/components/admin/mfa";
import { setPassword } from "../../_actions/auth";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const staff = await requireStaff();
  return (
    <>
      <AdminHeader title="My account" description={`${staff.email} · ${ROLE_LABEL[staff.role]}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Two-step verification" description="Recommended for every admin account.">
          <MfaEnroll />
        </Card>
        <Card title="Change password">
          <ActionForm action={setPassword} submitLabel="Update password">
            <Field label="New password" hint="At least 12 characters">
              <Input name="password" type="password" autoComplete="new-password" minLength={12} required />
            </Field>
            <Field label="Confirm new password">
              <Input name="confirm" type="password" autoComplete="new-password" minLength={12} required />
            </Field>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
