import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATALOGUE_ROLES, hasRole, requireStaff } from "@/lib/admin/auth";
import { createSessionClient } from "@/lib/supabase/clients";
import { AdminHeader, Card, Checkbox, Field, Input, Select, Textarea } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/action-form";
import { UploadField } from "@/components/admin/uploads";
import { NoAccess } from "@/components/admin/no-access";
import { deleteResource, saveResource } from "../../../_actions/catalogue";

export const metadata: Metadata = { title: "Resource" };

const TYPES = [
  ["brochure", "Brochure"],
  ["datasheet", "Technical data sheet"],
  ["manual", "Manual"],
  ["maintenance_guide", "Maintenance guide"],
  ["certificate", "Certificate"],
  ["award", "Award"],
  ["other", "Other"],
] as const;

export default async function ResourceEditPage({ params, searchParams }: PageProps<"/admin/resources/[id]">) {
  const staff = await requireStaff();
  if (!hasRole(staff, CATALOGUE_ROLES)) return <NoAccess />;
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === "new";
  if (!isNew && !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createSessionClient();
  const [resourceRes, { data: products }, linksRes] = await Promise.all([
    isNew ? Promise.resolve({ data: null }) : supabase.from("resources").select("*").eq("id", id).maybeSingle(),
    supabase.from("products").select("id, name").order("name"),
    isNew ? Promise.resolve({ data: [] as { product_id: string }[] }) : supabase.from("product_resources").select("product_id").eq("resource_id", id),
  ]);
  const r = resourceRes.data;
  if (!isNew && !r) notFound();
  const linked = new Set((linksRes.data ?? []).map((x) => x.product_id));

  return (
    <>
      <AdminHeader back={{ href: "/admin/resources", label: "Resources" }} title={r?.title ?? "Upload resource"} />
      {sp.created && <p className="mb-4 rounded-lg bg-accent-soft p-3 text-sm text-accent-strong">Resource saved.</p>}
      <div className="grid gap-6">
        <Card>
          <ActionForm action={saveResource.bind(null, isNew ? null : id)} submitLabel={isNew ? "Save resource" : "Save changes"}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="File" className="sm:col-span-2" hint="PDF or image, up to 50 MB. Files are public once published.">
                <UploadField name="storage_path" bucket="documents" folder="resources" defaultValue={r?.storage_path} accept="application/pdf,image/*" withMeta />
              </Field>
              <Field label="Title" htmlFor="r-title">
                <Input id="r-title" name="title" defaultValue={r?.title} required />
              </Field>
              <Field label="Type" htmlFor="r-type">
                <Select id="r-type" name="type" defaultValue={r?.type ?? "brochure"}>
                  {TYPES.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Description" htmlFor="r-desc" className="sm:col-span-2">
                <Textarea id="r-desc" name="description" rows={2} defaultValue={r?.description ?? ""} />
              </Field>
              <Field label="Issuer" htmlFor="r-issuer" hint="For certificates and awards">
                <Input id="r-issuer" name="issuer" defaultValue={r?.issuer ?? ""} />
              </Field>
              <Field label="Certificate number" htmlFor="r-num">
                <Input id="r-num" name="certificate_number" defaultValue={r?.certificate_number ?? ""} />
              </Field>
              <Field label="Valid from" htmlFor="r-from">
                <Input id="r-from" name="valid_from" type="date" defaultValue={r?.valid_from ?? ""} />
              </Field>
              <Field label="Valid until" htmlFor="r-to" hint="After this date the file is hidden from the site.">
                <Input id="r-to" name="valid_to" type="date" defaultValue={r?.valid_to ?? ""} />
              </Field>
              <Field label="Sort order" htmlFor="r-sort">
                <Input id="r-sort" name="sort_order" type="number" defaultValue={r?.sort_order ?? 0} />
              </Field>
              <div className="flex items-end">
                <Checkbox name="is_published" defaultChecked={r?.is_published ?? true} label="Published on the website" />
              </div>
              {/* Keep existing metadata when the file is not replaced */}
              {r && (
                <>
                  <input type="hidden" name="file_size_existing" value={r.file_size ?? ""} />
                  <input type="hidden" name="mime_type_existing" value={r.mime_type ?? ""} />
                </>
              )}
              <fieldset className="grid gap-2 sm:col-span-2">
                <legend className="mb-2 text-sm font-medium">Show as a download on these products</legend>
                <div className="grid max-h-60 gap-2 overflow-y-auto sm:grid-cols-2">
                  {(products ?? []).map((p) => (
                    <Checkbox key={p.id} name="products" value={p.id} defaultChecked={linked.has(p.id)} label={p.name} />
                  ))}
                </div>
              </fieldset>
            </div>
          </ActionForm>
        </Card>
        {r && (
          <Card title="Delete resource" className="border-danger/30">
            <ActionForm action={deleteResource.bind(null, id)} submitLabel="Delete resource" variant="danger" confirm={`Delete “${r.title}” and its file?`}>
              <p className="text-sm text-muted">The file is removed from storage and from every product.</p>
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  );
}
