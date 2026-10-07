import { ActionForm } from "@/components/admin/action-form";
import { Field, Input, Select, Textarea } from "@/components/admin/ui";
import { UploadField } from "@/components/admin/uploads";
import type { ActionState } from "@/lib/admin/auth";
import type { Category } from "@/lib/types";

export function CategoryForm({
  category,
  action,
}: {
  category?: Category;
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
}) {
  const c = category;
  return (
    <ActionForm action={action} submitLabel={c ? "Save category" : "Create category"}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="c-name">
          <Input id="c-name" name="name" defaultValue={c?.name} required />
        </Field>
        <Field label="URL slug" htmlFor="c-slug">
          <Input id="c-slug" name="slug" defaultValue={c?.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
        </Field>
        <Field label="Status" htmlFor="c-status">
          <Select id="c-status" name="status" defaultValue={c?.status ?? "draft"}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="coming_soon">Coming soon</option>
            <option value="discontinued">Discontinued</option>
          </Select>
        </Field>
        <Field label="Sort order" htmlFor="c-sort">
          <Input id="c-sort" name="sort_order" type="number" defaultValue={c?.sort_order ?? 0} />
        </Field>
        <Field label="Description" htmlFor="c-desc" className="sm:col-span-2">
          <Textarea id="c-desc" name="description" rows={2} defaultValue={c?.description ?? ""} />
        </Field>
        <Field label="Image" className="sm:col-span-2">
          <UploadField name="image_path" bucket="product-images" folder="categories" defaultValue={c?.image_path} accept="image/*" label="Upload image" />
        </Field>
        <Field label="SEO title" htmlFor="c-seo">
          <Input id="c-seo" name="seo_title" defaultValue={c?.seo_title ?? ""} />
        </Field>
        <Field label="SEO description" htmlFor="c-seod">
          <Input id="c-seod" name="seo_description" defaultValue={c?.seo_description ?? ""} />
        </Field>
      </div>
    </ActionForm>
  );
}
