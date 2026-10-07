import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATALOGUE_ROLES, hasRole, requireStaff } from "@/lib/admin/auth";
import { createSessionClient } from "@/lib/supabase/clients";
import type { Category } from "@/lib/types";
import { AdminHeader, Card } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/action-form";
import { AttributeEditor } from "@/components/admin/spec-grid";
import { NoAccess } from "@/components/admin/no-access";
import { deleteCategory, saveAttributes, saveCategory } from "../../../_actions/catalogue";
import { CategoryForm } from "../category-form";

export const metadata: Metadata = { title: "Edit category" };

export default async function EditCategoryPage({ params }: PageProps<"/admin/categories/[id]">) {
  const staff = await requireStaff();
  if (!hasRole(staff, CATALOGUE_ROLES)) return <NoAccess />;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createSessionClient();
  const [{ data: category }, { data: attributes }] = await Promise.all([
    supabase.from("categories").select("*").eq("id", id).maybeSingle(),
    supabase.from("spec_attributes").select("*").eq("category_id", id).order("sort_order"),
  ]);
  if (!category) notFound();

  return (
    <>
      <AdminHeader back={{ href: "/admin/categories", label: "Categories" }} title={category.name} description={`/products/${category.slug}`} />
      <div className="grid gap-6">
        <Card title="Details">
          <CategoryForm category={category as Category} action={saveCategory.bind(null, id)} />
        </Card>
        <Card title="Spec attribute dictionary" description="The columns of every model table in this category.">
          <AttributeEditor
            action={saveAttributes.bind(null, id)}
            initial={(attributes ?? []).map((a) => ({
              id: a.id,
              key: a.key,
              label: a.label,
              unit: a.unit ?? "",
              data_type: a.data_type,
              group_label: a.group_label ?? "",
              is_key_spec: a.is_key_spec,
              is_filterable: a.is_filterable,
            }))}
          />
        </Card>
        <Card title="Delete category" className="border-danger/30">
          <ActionForm action={deleteCategory.bind(null, id)} submitLabel="Delete category" variant="danger" confirm={`Delete “${category.name}”?`}>
            <p className="text-sm text-muted">Only empty categories can be deleted.</p>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
