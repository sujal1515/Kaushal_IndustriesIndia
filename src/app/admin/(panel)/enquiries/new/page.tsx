import type { Metadata } from "next";
import { ENQUIRY_ROLES, hasRole, requireStaff } from "@/lib/admin/auth";
import { createSessionClient } from "@/lib/supabase/clients";
import { listProducts } from "@/lib/data/catalogue";
import { countries } from "@/lib/enquiry/options";
import { CURRENCIES, PRIORITIES, SOURCES } from "@/lib/admin/leads";
import { AdminHeader, Card, Field, Input, Select, Textarea } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/action-form";
import { NoAccess } from "@/components/admin/no-access";
import { createLead } from "../../../_actions/leads";

export const metadata: Metadata = { title: "Add lead" };

export default async function NewLeadPage() {
  const staff = await requireStaff();
  if (!hasRole(staff, ENQUIRY_ROLES)) return <NoAccess />;
  const supabase = await createSessionClient();
  const [products, { data: people }] = await Promise.all([
    listProducts(),
    supabase.from("profiles").select("id, full_name, email, role").eq("is_active", true).order("full_name"),
  ]);
  const team = (people ?? []).filter((p) => p.role !== "editor");
  const countryList = countries();

  return (
    <>
      <AdminHeader back={{ href: "/admin/enquiries", label: "Enquiries" }} title="Add lead" description="For enquiries that arrive by phone, email, WhatsApp or at a trade show." />
      <ActionForm action={createLead} submitLabel="Add lead">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="grid content-start gap-6 lg:col-span-2">
            <Card title="Buyer">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name *" htmlFor="name">
                  <Input id="name" name="name" required maxLength={120} />
                </Field>
                <Field label="Company" htmlFor="company">
                  <Input id="company" name="company" maxLength={160} />
                </Field>
                <Field label="Email *" htmlFor="email">
                  <Input id="email" name="email" type="email" required maxLength={200} />
                </Field>
                <Field label="Phone / WhatsApp" htmlFor="phone">
                  <Input id="phone" name="phone" maxLength={40} placeholder="+254 …" />
                </Field>
                <Field label="Buyer's country" htmlFor="buyer_country">
                  <Select id="buyer_country" name="buyer_country" defaultValue="">
                    <option value="">—</option>
                    {countryList.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Enquiry type" htmlFor="type">
                  <Select id="type" name="type" defaultValue="rfq">
                    <option value="rfq">Request for quotation</option>
                    <option value="distributor">Distributor enquiry</option>
                    <option value="contact">General enquiry</option>
                  </Select>
                </Field>
              </div>
            </Card>
            <Card title="Requirement">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Product" htmlFor="product" className="sm:col-span-2">
                  <Input id="product" name="product" list="product-options" maxLength={200} placeholder="Start typing a product…" />
                  <datalist id="product-options">
                    {products.map((p) => (
                      <option key={p.id} value={p.name} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Model" htmlFor="model">
                  <Input id="model" name="model" maxLength={60} placeholder="e.g. EF1A" />
                </Field>
                <div className="grid grid-cols-[1fr_7rem] gap-2">
                  <Field label="Quantity" htmlFor="quantity">
                    <Input id="quantity" name="quantity" type="number" min={1} step={1} />
                  </Field>
                  <Field label="Unit" htmlFor="quantity_unit">
                    <Select id="quantity_unit" name="quantity_unit" defaultValue="units">
                      <option value="units">Units</option>
                      <option value="sets">Sets</option>
                    </Select>
                  </Field>
                </div>
                <Field label="Destination country" htmlFor="destination_country">
                  <Select id="destination_country" name="destination_country" defaultValue="">
                    <option value="">—</option>
                    {countryList.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Notes from the conversation" htmlFor="message" className="sm:col-span-2">
                  <Textarea id="message" name="message" rows={5} maxLength={5000} />
                </Field>
              </div>
            </Card>
          </div>
          <div className="grid content-start gap-6">
            <Card title="Lead details">
              <div className="grid gap-4">
                <Field label="Source" htmlFor="source">
                  <Select id="source" name="source" defaultValue="phone">
                    {SOURCES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Priority" htmlFor="priority">
                  <Select id="priority" name="priority" defaultValue="normal">
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Assigned to" htmlFor="assigned_to">
                  <Select id="assigned_to" name="assigned_to" defaultValue={staff.id}>
                    {team.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name || p.email}
                      </option>
                    ))}
                  </Select>
                </Field>
                <div className="grid grid-cols-[1fr_6rem] gap-2">
                  <Field label="Estimated value" htmlFor="estimated_value">
                    <Input id="estimated_value" name="estimated_value" inputMode="decimal" placeholder="0" />
                  </Field>
                  <Field label="Currency" htmlFor="currency">
                    <Select id="currency" name="currency" defaultValue="USD">
                      {CURRENCIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <Field label="Follow up on" htmlFor="follow_up_at" hint="India time.">
                  <Input id="follow_up_at" name="follow_up_at" type="datetime-local" />
                </Field>
                <Field label="Tags" htmlFor="tags" hint="Comma separated, e.g. tender, repeat buyer">
                  <Input id="tags" name="tags" maxLength={500} />
                </Field>
              </div>
            </Card>
          </div>
        </div>
      </ActionForm>
    </>
  );
}
