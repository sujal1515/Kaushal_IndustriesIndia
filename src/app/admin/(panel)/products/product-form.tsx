import { ActionForm } from "@/components/admin/action-form";
import { Checkbox, Field, Input, Select, Textarea, toLines } from "@/components/admin/ui";
import type { ActionState } from "@/lib/admin/auth";
import type { Product } from "@/lib/types";

export function ProductForm({
  product,
  categories,
  action,
}: {
  product?: Partial<Product>;
  categories: { id: string; name: string }[];
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
}) {
  const p = product ?? {};
  return (
    <ActionForm action={action} submitLabel={product?.id ? "Save product" : "Create product"}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name">
          <Input id="name" name="name" defaultValue={p.name} required />
        </Field>
        <Field label="URL slug" htmlFor="slug" hint="Lowercase words joined by hyphens. Changing it changes the page URL — add a redirect.">
          <Input id="slug" name="slug" defaultValue={p.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
        </Field>
        <Field label="Category" htmlFor="category_id">
          <Select id="category_id" name="category_id" defaultValue={p.category_id} required>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status" htmlFor="status" hint="Drafts are hidden. Discontinued products stay reachable but leave listings.">
          <Select id="status" name="status" defaultValue={p.status ?? "draft"}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="coming_soon">Coming soon</option>
            <option value="discontinued">Discontinued</option>
          </Select>
        </Field>
        <Field label="Subtitle" htmlFor="subtitle">
          <Input id="subtitle" name="subtitle" defaultValue={p.subtitle ?? ""} />
        </Field>
        <Field label="Sort order" htmlFor="sort_order">
          <Input id="sort_order" name="sort_order" type="number" defaultValue={p.sort_order ?? 0} />
        </Field>
        <Field label="Summary" htmlFor="summary" hint="One or two sentences for cards and search results." className="sm:col-span-2">
          <Textarea id="summary" name="summary" rows={2} defaultValue={p.summary ?? ""} />
        </Field>
        <Field label="Description" htmlFor="description_md" hint="Paragraphs separated by a blank line. Lines starting with “- ” become a list." className="sm:col-span-2">
          <Textarea id="description_md" name="description_md" rows={6} defaultValue={p.description_md ?? ""} />
        </Field>
        <Field label="Filter facets" htmlFor="facets" hint="“Facet: value” per line, e.g. Cooling: Air cooled">
          <Textarea id="facets" name="facets" rows={3} defaultValue={Object.entries(p.facets ?? {}).map(([k, v]) => `${k}: ${v}`).join("\n")} />
        </Field>
        <Field label="Key specs (when there is no model table)" htmlFor="highlights" hint="“Label: value” per line">
          <Textarea id="highlights" name="highlights" rows={3} defaultValue={toLines(p.highlights ?? [])} />
        </Field>
        <Field label="Construction details" htmlFor="descriptive_specs" hint="“Label: value” per line, e.g. Rotation: Clockwise facing the flywheel" className="sm:col-span-2">
          <Textarea id="descriptive_specs" name="descriptive_specs" rows={6} defaultValue={toLines(p.descriptive_specs ?? [])} />
        </Field>
        <Field label="Standard equipment" htmlFor="standard_equipment" hint="One per line">
          <Textarea id="standard_equipment" name="standard_equipment" rows={4} defaultValue={(p.standard_equipment ?? []).join("\n")} />
        </Field>
        <Field label="Options on request" htmlFor="optional_extras" hint="One per line">
          <Textarea id="optional_extras" name="optional_extras" rows={4} defaultValue={(p.optional_extras ?? []).join("\n")} />
        </Field>
        <Field label="Notes" htmlFor="notes" hint="One per line; the last note shows beside the spec table" className="sm:col-span-2">
          <Textarea id="notes" name="notes" rows={2} defaultValue={(p.notes ?? []).join("\n")} />
        </Field>
        <Field label="SEO title" htmlFor="seo_title" hint="Optional. Defaults to the product name.">
          <Input id="seo_title" name="seo_title" defaultValue={p.seo_title ?? ""} maxLength={120} />
        </Field>
        <Field label="Legacy URL" htmlFor="legacy_path" hint="Old site path, for reference">
          <Input id="legacy_path" name="legacy_path" defaultValue={p.legacy_path ?? ""} />
        </Field>
        <Field label="SEO description" htmlFor="seo_description" hint="Optional, up to ~160 characters." className="sm:col-span-2">
          <Textarea id="seo_description" name="seo_description" rows={2} defaultValue={p.seo_description ?? ""} maxLength={320} />
        </Field>
        <div className="sm:col-span-2">
          <Checkbox name="is_featured" defaultChecked={p.is_featured} label="Featured product" />
        </div>
      </div>
    </ActionForm>
  );
}
