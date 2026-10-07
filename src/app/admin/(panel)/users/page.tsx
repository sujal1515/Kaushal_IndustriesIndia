import type { Metadata } from "next";
import { ROLE_LABEL, requireStaff } from "@/lib/admin/auth";
import { createSessionClient } from "@/lib/supabase/clients";
import { formatDate } from "@/lib/utils";
import { AdminHeader, Card, Checkbox, Field, Input, Select } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/action-form";
import { NoAccess } from "@/components/admin/no-access";
import { inviteUser, updateUser } from "../../_actions/admin";

export const metadata: Metadata = { title: "Users" };

const ROLE_HELP = {
  admin: "Everything, including users and settings",
  editor: "Products, categories, applications, resources, FAQs",
  sales: "Enquiries only",
};

export default async function UsersPage() {
  const staff = await requireStaff();
  if (staff.role !== "admin") return <NoAccess />;
  const supabase = await createSessionClient();
  const { data: users } = await supabase.from("profiles").select("*").order("created_at");

  return (
    <>
      <AdminHeader title="Users" description="Invite-only access. Each person signs in with their own account." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid content-start gap-3 lg:col-span-2">
          {(users ?? []).map((u) => (
            <Card key={u.id}>
              <ActionForm action={updateUser.bind(null, u.id)} submitLabel="Update">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Name">
                    <Input name="full_name" defaultValue={u.full_name ?? ""} />
                  </Field>
                  <Field label="Role">
                    <Select name="role" defaultValue={u.role}>
                      {(["admin", "editor", "sales"] as const).map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <div className="flex items-end pb-2">
                    <Checkbox name="is_active" defaultChecked={u.is_active} label="Active" />
                  </div>
                </div>
                <p className="text-xs text-muted">
                  {u.email} · added {formatDate(u.created_at)} {u.id === staff.id && "· (you)"}
                </p>
              </ActionForm>
            </Card>
          ))}
        </div>
        <Card title="Invite a colleague" description="They receive an email to set a password.">
          <ActionForm action={inviteUser} submitLabel="Send invitation">
            <Field label="Full name">
              <Input name="full_name" required />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" required />
            </Field>
            <Field label="Role">
              <Select name="role" defaultValue="sales">
                {(["sales", "editor", "admin"] as const).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]} — {ROLE_HELP[r]}
                  </option>
                ))}
              </Select>
            </Field>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
