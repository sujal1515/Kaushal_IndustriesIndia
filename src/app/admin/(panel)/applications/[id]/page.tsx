import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATALOGUE_ROLES, hasRole, requireStaff } from "@/lib/admin/auth";
import { createSessionClient } from "@/lib/supabase/clients";
import { AdminHeader, Card, Field, Input, Select, Textarea } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/action-form";
import { UploadField } from "@/components/admin/uploads";
import { NoAccess } from "@/components/admin/no-access";
import { deleteApplication, saveApplication } from "../../../_actions/catalogue";

export const metadata: Metadata = { title: "Application" };

export default async function ApplicationEditPage({ params }: PageProps<"/admin/applications/[id]">) {
  const staff = await requireStaff();
  if (!hasRole(staff, CATALOGUE_ROLES)) return <NoAccess />;
  const { id } = await params;
  const isNew = id === "new";
  if (!isNew && !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createSessionClient();
  const a = isNew ? null : (await supabase.from("applications").select("*").eq("id", id).maybeSingle()).data;
  if (!isNew && !a) notFound();

  return (
    <>
      <AdminHeader back={{ href: "/admin/applications", label: "Applications" }} title={a?.name ?? "New application"} description={a ? `/applications/${a.slug}` : undefined} />
      <div className="grid gap-6">
        <Card>
          <ActionForm action={saveApplication.bind(null, isNew ? null : id)} submitLabel={isNew ? "Create application" : "Save application"}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" htmlFor="a-name">
                <Input id="a-name" name="name" defaultValue={a?.name} required />
              </Field>
              <Field label="URL slug" htmlFor="a-slug">
                <Input id="a-slug" name="slug" defaultValue={a?.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
              </Field>
              <Field label="Status" htmlFor="a-status">
                <Select id="a-status" name="status" defaultValue={a?.status ?? "draft"}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </Select>
              </Field>
              <Field label="Sort order" htmlFor="a-sort">
                <Input id="a-sort" name="sort_order" type="number" defaultValue={a?.sort_order ?? 0} />
              </Field>
              <Field label="Summary" htmlFor="a-summary" className="sm:col-span-2">
                <Textarea id="a-summary" name="summary" rows={2} defaultValue={a?.summary ?? ""} />
              </Field>
              <Field label="Body" htmlFor="a-body" hint="Paragraphs separated by a blank line; “- ” starts a list item." className="sm:col-span-2">
                <Textarea id="a-body" name="body_md" rows={8} defaultValue={a?.body_md ?? ""} />
              </Field>
              <Field label="Image" className="sm:col-span-2">
                <UploadField name="image_path" bucket="product-images" folder="applications" defaultValue={a?.image_path} accept="image/*" label="Upload image" />
              </Field>
              <Field label="SEO title" htmlFor="a-seo">
                <Input id="a-seo" name="seo_title" defaultValue={a?.seo_title ?? ""} />
              </Field>
              <Field label="SEO description" htmlFor="a-seod">
                <Input id="a-seod" name="seo_description" defaultValue={a?.seo_description ?? ""} />
              </Field>
            </div>
          </ActionForm>
        </Card>
        {a && (
          <Card title="Delete application" className="border-danger/30">
            <ActionForm action={deleteApplication.bind(null, id)} submitLabel="Delete application" variant="danger" confirm={`Delete “${a.name}”?`}>
              <p className="text-sm text-muted">Product links to this application are removed too.</p>
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  );
}
