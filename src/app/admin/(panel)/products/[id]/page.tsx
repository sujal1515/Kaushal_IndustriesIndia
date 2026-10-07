import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATALOGUE_ROLES, hasRole, requireStaff } from "@/lib/admin/auth";
import { createSessionClient } from "@/lib/supabase/clients";
import { mediaUrl } from "@/lib/env";
import { statusLabel } from "@/lib/utils";
import type { Product } from "@/lib/types";
import { AdminHeader, Card, Checkbox, Field, Input, Pill, statusTone } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/action-form";
import { SpecGrid } from "@/components/admin/spec-grid";
import { ProductImageUpload } from "@/components/admin/uploads";
import { NoAccess } from "@/components/admin/no-access";
import { ProductForm } from "../product-form";
import {
  addProductImage,
  deleteProduct,
  deleteProductImage,
  saveModels,
  saveProduct,
  saveProductLinks,
  updateProductImage,
} from "../../../_actions/catalogue";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  const staff = await requireStaff();
  if (!hasRole(staff, CATALOGUE_ROLES)) return <NoAccess />;
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createSessionClient();
  const { data: product } = await supabase.from("products").select("*, category:categories(id, slug, name)").eq("id", id).maybeSingle();
  if (!product) notFound();
  const category = product.category as { id: string; slug: string; name: string };

  const [
    { data: categories },
    { data: attributes },
    { data: models },
    { data: images },
    { data: applications },
    { data: allProducts },
    { data: resources },
    { data: links },
  ] = await Promise.all([
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase.from("spec_attributes").select("id, key, label, unit, data_type").eq("category_id", product.category_id).order("sort_order"),
    supabase.from("product_models").select("id, model_code, group_label, status, model_spec_values(attribute_id, value_text, value_num)").eq("product_id", id).order("sort_order"),
    supabase.from("product_images").select("*").eq("product_id", id).order("sort_order"),
    supabase.from("applications").select("id, name").order("sort_order"),
    supabase.from("products").select("id, name").neq("id", id).order("name"),
    supabase.from("resources").select("id, title, type").order("sort_order"),
    Promise.all([
      supabase.from("product_applications").select("application_id").eq("product_id", id),
      supabase.from("related_products").select("related_product_id").eq("product_id", id).order("sort_order"),
      supabase.from("product_resources").select("resource_id").eq("product_id", id),
    ]).then(([a, r, res]) => ({
      data: {
        apps: new Set((a.data ?? []).map((x) => x.application_id)),
        related: new Set((r.data ?? []).map((x) => x.related_product_id)),
        resources: new Set((res.data ?? []).map((x) => x.resource_id)),
      },
    })),
  ]);

  const attrById = new Map((attributes ?? []).map((a) => [a.id, a]));
  const gridRows = (models ?? []).map((m) => ({
    id: m.id,
    model_code: m.model_code,
    group_label: m.group_label ?? "",
    status: m.status,
    values: Object.fromEntries(
      (m.model_spec_values as { attribute_id: string; value_text: string | null; value_num: number | null }[])
        .map((v) => [attrById.get(v.attribute_id)?.key, v.value_num !== null ? String(v.value_num) : (v.value_text ?? "")])
        .filter(([k]) => k),
    ),
  }));
  const publicPath = `/products/${category.slug}/${product.slug}`;

  return (
    <>
      <AdminHeader
        back={{ href: "/admin/products", label: "Products" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {product.name}
            <Pill tone={statusTone(product.status)}>{statusLabel[product.status]}</Pill>
          </span>
        }
        description={category.name}
        actions={
          product.status !== "draft" ? (
            <Link href={publicPath} target="_blank" className="inline-flex h-9 items-center rounded-lg border border-line-strong bg-surface px-3.5 text-sm font-medium hover:border-ink/40">
              View on site ↗
            </Link>
          ) : null
        }
      />
      {sp.created && <p className="mb-4 rounded-lg bg-accent-soft p-3 text-sm text-accent-strong">Product created. Add models, images and links below.</p>}

      <nav aria-label="Sections" className="mb-6 flex flex-wrap gap-2 text-sm">
        {[
          ["details", "Details"],
          ["models", `Models & specs (${gridRows.length})`],
          ["images", `Images (${images?.length ?? 0})`],
          ["links", "Applications, related & downloads"],
        ].map(([href, label]) => (
          <a key={href} href={`#${href}`} className="rounded-full border border-line bg-surface px-3 py-1.5 hover:border-ink/40">
            {label}
          </a>
        ))}
      </nav>

      <div className="grid gap-6">
        <Card id="details" title="Details">
          <ProductForm product={product as Product} categories={categories ?? []} action={saveProduct.bind(null, id)} />
        </Card>

        <Card id="models" title="Models & specifications" description={`Columns come from the ${category.name} attribute dictionary.`} actions={<Link href={`/admin/categories/${category.id}`} className="text-sm text-accent">Edit attributes →</Link>}>
          <SpecGrid attributes={attributes ?? []} initial={gridRows} action={saveModels.bind(null, id)} />
        </Card>

        <Card id="images" title="Images" description="The primary image is used on cards and as the share image. Alt text is required.">
          <div className="grid gap-4">
            <ul className="grid gap-3">
              {(images ?? []).map((img) => (
                <li key={img.id} className="grid gap-4 rounded-lg border border-line p-3 sm:grid-cols-[96px_1fr]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
                  <img src={mediaUrl(img.storage_path) ?? ""} alt="" className="h-24 w-24 rounded-md bg-stone object-contain p-1 mix-blend-multiply" />
                  <div className="grid gap-3">
                    <ActionForm action={updateProductImage.bind(null, img.id, id)} submitLabel="Update" className="!gap-3">
                      <div className="grid gap-3 sm:grid-cols-[1fr_100px]">
                        <Input name="alt_text" defaultValue={img.alt_text} aria-label="Alt text" required />
                        <Input name="sort_order" type="number" defaultValue={img.sort_order} aria-label="Sort order" />
                      </div>
                      <Checkbox name="is_primary" defaultChecked={img.is_primary} label="Primary image" />
                    </ActionForm>
                    <ActionForm action={deleteProductImage.bind(null, img.id)} submitLabel="Remove image" variant="danger" confirm="Remove this image?" />
                  </div>
                </li>
              ))}
            </ul>
            <ProductImageUpload productId={id} addImage={addProductImage} />
          </div>
        </Card>

        <Card id="links" title="Applications, related products & downloads">
          <ActionForm action={saveProductLinks.bind(null, id)} submitLabel="Save links">
            <div className="grid gap-6 lg:grid-cols-3">
              <fieldset className="grid content-start gap-2">
                <legend className="mb-2 text-sm font-medium">Applications</legend>
                {(applications ?? []).map((a) => (
                  <Checkbox key={a.id} name="applications" value={a.id} defaultChecked={links.apps.has(a.id)} label={a.name} />
                ))}
              </fieldset>
              <fieldset className="grid content-start gap-2">
                <legend className="mb-2 text-sm font-medium">Related products</legend>
                <div className="grid max-h-72 gap-2 overflow-y-auto pr-2">
                  {(allProducts ?? []).map((p) => (
                    <Checkbox key={p.id} name="related" value={p.id} defaultChecked={links.related.has(p.id)} label={p.name} />
                  ))}
                </div>
              </fieldset>
              <fieldset className="grid content-start gap-2">
                <legend className="mb-2 text-sm font-medium">Downloads</legend>
                <div className="grid max-h-72 gap-2 overflow-y-auto pr-2">
                  {(resources ?? []).map((r) => (
                    <Checkbox key={r.id} name="resources" value={r.id} defaultChecked={links.resources.has(r.id)} label={<>{r.title} <span className="text-xs text-muted">({r.type})</span></>} />
                  ))}
                  {!resources?.length && <p className="text-sm text-muted">Upload files under Resources first.</p>}
                </div>
              </fieldset>
            </div>
          </ActionForm>
        </Card>

        <Card title="Delete product" className="border-danger/30">
          <ActionForm
            action={deleteProduct.bind(null, id)}
            submitLabel="Delete this product"
            variant="danger"
            confirm={`Delete “${product.name}” and all its models? This cannot be undone. Consider setting it to Discontinued instead.`}
          >
            <Field label="Before deleting">
              <p className="text-sm text-muted">
                Deleting removes the page ({publicPath}). If it was indexed or linked, prefer the Discontinued status, or add a redirect.
              </p>
            </Field>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
