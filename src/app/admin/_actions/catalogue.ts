"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { CATALOGUE_ROLES, assertRole, revalidateCatalogue, runAction, type ActionState } from "@/lib/admin/auth";
import { bool, date, dbError, facets, ids, int, labelLines, lines, oneOf, optStr, slug, str } from "@/lib/admin/parse";

const STATUSES = ["draft", "published", "coming_soon", "discontinued"] as const;
const RESOURCE_TYPES = ["brochure", "datasheet", "certificate", "award", "manual", "maintenance_guide", "other"] as const;
const UUID = /^[0-9a-f-]{36}$/i;

function guessMime(path: string) {
  const ext = path.split(".").pop()?.toLowerCase();
  return ({ pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" } as Record<string, string>)[ext ?? ""] ?? null;
}

/* ================================================================== */
/* Products                                                            */
/* ================================================================== */

export async function saveProduct(id: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  let createdId: string | null = null;
  const result = await runAction(async () => {
    const { supabase } = await assertRole(CATALOGUE_ROLES);
    const status = oneOf(fd, "status", STATUSES);
    const row = {
      name: str(fd, "name", { required: true, max: 200 }),
      slug: slug(fd),
      category_id: str(fd, "category_id", { required: true }),
      status,
      subtitle: optStr(fd, "subtitle", 200),
      summary: optStr(fd, "summary", 600),
      description_md: optStr(fd, "description_md", 10000),
      is_featured: bool(fd, "is_featured"),
      sort_order: int(fd, "sort_order"),
      facets: facets(fd, "facets"),
      highlights: labelLines(fd, "highlights"),
      descriptive_specs: labelLines(fd, "descriptive_specs"),
      standard_equipment: lines(fd, "standard_equipment"),
      optional_extras: lines(fd, "optional_extras"),
      notes: lines(fd, "notes"),
      seo_title: optStr(fd, "seo_title", 120),
      seo_description: optStr(fd, "seo_description", 320),
      legacy_path: optStr(fd, "legacy_path", 300),
      ...(status === "published" ? { published_at: new Date().toISOString() } : {}),
    };
    if (id) {
      const { error } = await supabase.from("products").update(row).eq("id", id);
      dbError(error);
    } else {
      const { data, error } = await supabase.from("products").insert(row).select("id").single();
      dbError(error);
      createdId = data!.id;
    }
    revalidateCatalogue();
    return id ? "Product saved" : "Product created";
  });
  if (createdId) redirect(`/admin/products/${createdId}?created=1`);
  return result;
}

export async function deleteProduct(id: string, _prev: ActionState): Promise<ActionState> {
  const result = await runAction(async () => {
    const { supabase } = await assertRole(CATALOGUE_ROLES);
    const { error } = await supabase.from("products").delete().eq("id", id);
    dbError(error);
    revalidateCatalogue();
  });
  if (result.ok) redirect("/admin/products?deleted=1");
  return result;
}

const modelRowSchema = z.object({
  id: z.string().nullable().optional(),
  model_code: z.string().trim().min(1, "Every model needs a code.").max(40),
  group_label: z.string().trim().max(80).nullable().optional(),
  status: z.enum(STATUSES),
  values: z.record(z.string(), z.string().max(200)),
});

/** Spec grid: replace the product's models and values in one save (blueprint §6.2). */
export async function saveModels(productId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const { supabase } = await assertRole(CATALOGUE_ROLES);
    let parsed: z.infer<typeof modelRowSchema>[];
    try {
      parsed = z.array(modelRowSchema).max(500).parse(JSON.parse(String(fd.get("payload") ?? "[]")));
    } catch (e) {
      throw new Error(e instanceof z.ZodError ? (e.issues[0]?.message ?? "Invalid model data") : "Invalid model data");
    }
    const codes = parsed.map((r) => r.model_code.toUpperCase());
    const dup = codes.find((c, i) => codes.indexOf(c) !== i);
    if (dup) throw new Error(`Model code ${dup} is used twice.`);

    const { data: product, error: pErr } = await supabase.from("products").select("category_id").eq("id", productId).single();
    dbError(pErr);
    const [{ data: attrs, error: aErr }, { data: existing, error: eErr }] = await Promise.all([
      supabase.from("spec_attributes").select("id, key, label, data_type").eq("category_id", product!.category_id),
      supabase.from("product_models").select("id").eq("product_id", productId),
    ]);
    dbError(aErr);
    dbError(eErr);

    const existingIds = new Set((existing ?? []).map((m) => m.id));
    const keepIds = new Set(parsed.map((r) => r.id).filter((x): x is string => !!x && existingIds.has(x)));
    const toDelete = [...existingIds].filter((x) => !keepIds.has(x));
    if (toDelete.length) dbError((await supabase.from("product_models").delete().in("id", toDelete)).error);

    const modelIds: string[] = [];
    for (const [i, r] of parsed.entries()) {
      const row = { model_code: r.model_code, group_label: r.group_label || null, status: r.status, sort_order: i + 1 };
      if (r.id && keepIds.has(r.id)) {
        dbError((await supabase.from("product_models").update(row).eq("id", r.id)).error);
        modelIds.push(r.id);
      } else {
        const { data, error } = await supabase.from("product_models").insert({ ...row, product_id: productId }).select("id").single();
        dbError(error);
        modelIds.push(data!.id);
      }
    }

    if (modelIds.length) dbError((await supabase.from("model_spec_values").delete().in("model_id", modelIds)).error);
    const values: Record<string, unknown>[] = [];
    parsed.forEach((r, i) => {
      for (const a of attrs ?? []) {
        const raw = (r.values[a.key] ?? "").trim();
        if (!raw) continue;
        if (a.data_type === "number") {
          const n = Number(raw.replace(/,/g, "."));
          if (!Number.isFinite(n)) throw new Error(`Model ${r.model_code}: “${a.label}” must be a number (got “${raw}”).`);
          values.push({ model_id: modelIds[i], attribute_id: a.id, value_num: n, value_text: null });
        } else {
          values.push({ model_id: modelIds[i], attribute_id: a.id, value_text: raw, value_num: null });
        }
      }
    });
    if (values.length) dbError((await supabase.from("model_spec_values").insert(values)).error);

    revalidateCatalogue();
    return `${parsed.length} model${parsed.length === 1 ? "" : "s"} saved`;
  });
}

export async function addProductImage(productId: string, storagePath: string, alt: string): Promise<ActionState> {
  return runAction(async () => {
    const { supabase } = await assertRole(CATALOGUE_ROLES);
    if (!alt.trim()) throw new Error("Alt text is required.");
    const { count } = await supabase.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", productId);
    dbError(
      (
        await supabase.from("product_images").insert({
          product_id: productId,
          storage_path: storagePath,
          alt_text: alt.trim().slice(0, 300),
          sort_order: (count ?? 0) + 1,
          is_primary: (count ?? 0) === 0,
        })
      ).error,
    );
    revalidateCatalogue();
    return "Image added";
  });
}

export async function updateProductImage(imageId: string, productId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const { supabase } = await assertRole(CATALOGUE_ROLES);
    const isPrimary = bool(fd, "is_primary");
    if (isPrimary) dbError((await supabase.from("product_images").update({ is_primary: false }).eq("product_id", productId)).error);
    dbError(
      (
        await supabase
          .from("product_images")
          .update({ alt_text: str(fd, "alt_text", { required: true, max: 300 }), sort_order: int(fd, "sort_order"), is_primary: isPrimary })
          .eq("id", imageId)
      ).error,
    );
    revalidateCatalogue();
    return "Image updated";
  });
}

export async function deleteProductImage(imageId: string, _prev: ActionState): Promise<ActionState> {
  return runAction(async () => {
    const { supabase } = await assertRole(CATALOGUE_ROLES);
    const { data } = await supabase.from("product_images").select("storage_path").eq("id", imageId).single();
    dbError((await supabase.from("product_images").delete().eq("id", imageId)).error);
    // Remove the file too when it lives in Storage (local /images/... seed files are left alone).
    if (data?.storage_path && !data.storage_path.startsWith("/") && !/^https?:/.test(data.storage_path)) {
      await supabase.storage.from("product-images").remove([data.storage_path]);
    }
    revalidateCatalogue();
    return "Image removed";
  });
}

export async function saveProductLinks(productId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const { supabase } = await assertRole(CATALOGUE_ROLES);
    const apps = ids(fd, "applications");
    const related = ids(fd, "related").filter((r) => r !== productId);
    const resources = ids(fd, "resources");

    dbError((await supabase.from("product_applications").delete().eq("product_id", productId)).error);
    if (apps.length) dbError((await supabase.from("product_applications").insert(apps.map((a) => ({ product_id: productId, application_id: a })))).error);

    dbError((await supabase.from("related_products").delete().eq("product_id", productId)).error);
    if (related.length)
      dbError(
        (await supabase.from("related_products").insert(related.map((r, i) => ({ product_id: productId, related_product_id: r, sort_order: i + 1 })))).error,
      );

    dbError((await supabase.from("product_resources").delete().eq("product_id", productId)).error);
    if (resources.length)
      dbError((await supabase.from("product_resources").insert(resources.map((r) => ({ product_id: productId, resource_id: r })))).error);

    revalidateCatalogue();
    return "Links saved";
  });
}

/* ================================================================== */
/* Categories & attribute dictionary                                   */
/* ================================================================== */

export async function saveCategory(id: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  let createdId: string | null = null;
  const result = await runAction(async () => {
    const { supabase } = await assertRole(CATALOGUE_ROLES);
    const row = {
      name: str(fd, "name", { required: true, max: 120 }),
      slug: slug(fd),
      description: optStr(fd, "description", 600),
      image_path: optStr(fd, "image_path", 500),
      sort_order: int(fd, "sort_order"),
      status: oneOf(fd, "status", STATUSES),
      seo_title: optStr(fd, "seo_title", 120),
      seo_description: optStr(fd, "seo_description", 320),
    };
    if (id) dbError((await supabase.from("categories").update(row).eq("id", id)).error);
    else {
      const { data, error } = await supabase.from("categories").insert(row).select("id").single();
      dbError(error);
      createdId = data!.id;
    }
    revalidateCatalogue();
    return "Category saved";
  });
  if (createdId) redirect(`/admin/categories/${createdId}`);
  return result;
}

export async function deleteCategory(id: string, _prev: ActionState): Promise<ActionState> {
  const result = await runAction(async () => {
    const { supabase } = await assertRole(CATALOGUE_ROLES);
    const { count } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("category_id", id);
    if (count) throw new Error(`Move or delete the ${count} product(s) in this category first.`);
    dbError((await supabase.from("categories").delete().eq("id", id)).error);
    revalidateCatalogue();
  });
  if (result.ok) redirect("/admin/categories");
  return result;
}

const attrRowSchema = z.object({
  id: z.string().nullable().optional(),
  key: z.string().regex(/^[a-z0-9_]+$/, "Attribute keys use lowercase letters, numbers and underscores."),
  label: z.string().trim().min(1, "Every attribute needs a label.").max(120),
  unit: z.string().trim().max(30).nullable().optional(),
  data_type: z.enum(["number", "text", "range"]),
  group_label: z.string().trim().max(80).nullable().optional(),
  is_key_spec: z.boolean(),
  is_filterable: z.boolean(),
});

export async function saveAttributes(categoryId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const { supabase } = await assertRole(CATALOGUE_ROLES);
    let rows: z.infer<typeof attrRowSchema>[];
    try {
      rows = z.array(attrRowSchema).max(100).parse(JSON.parse(String(fd.get("payload") ?? "[]")));
    } catch (e) {
      throw new Error(e instanceof z.ZodError ? (e.issues[0]?.message ?? "Invalid attributes") : "Invalid attributes");
    }
    const keys = rows.map((r) => r.key);
    const dup = keys.find((k, i) => keys.indexOf(k) !== i);
    if (dup) throw new Error(`Key “${dup}” is used twice.`);

    const { data: existing } = await supabase.from("spec_attributes").select("id").eq("category_id", categoryId);
    const existingIds = new Set((existing ?? []).map((a) => a.id));
    const keep = new Set(rows.map((r) => r.id).filter((x): x is string => !!x && existingIds.has(x)));
    const remove = [...existingIds].filter((x) => !keep.has(x));
    if (remove.length) dbError((await supabase.from("spec_attributes").delete().in("id", remove)).error);

    for (const [i, r] of rows.entries()) {
      const row = {
        key: r.key,
        label: r.label,
        unit: r.unit || null,
        data_type: r.data_type,
        group_label: r.group_label || null,
        is_key_spec: r.is_key_spec,
        is_filterable: r.is_filterable,
        sort_order: i + 1,
      };
      if (r.id && keep.has(r.id)) dbError((await supabase.from("spec_attributes").update(row).eq("id", r.id)).error);
      else dbError((await supabase.from("spec_attributes").insert({ ...row, category_id: categoryId })).error);
    }
    revalidateCatalogue();
    return "Attributes saved";
  });
}

/* ================================================================== */
/* Applications                                                        */
/* ================================================================== */

export async function saveApplication(id: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  let createdId: string | null = null;
  const result = await runAction(async () => {
    const { supabase } = await assertRole(CATALOGUE_ROLES);
    const row = {
      name: str(fd, "name", { required: true, max: 120 }),
      slug: slug(fd),
      summary: optStr(fd, "summary", 400),
      body_md: optStr(fd, "body_md", 10000),
      image_path: optStr(fd, "image_path", 500),
      sort_order: int(fd, "sort_order"),
      status: oneOf(fd, "status", STATUSES),
      seo_title: optStr(fd, "seo_title", 120),
      seo_description: optStr(fd, "seo_description", 320),
    };
    if (id) dbError((await supabase.from("applications").update(row).eq("id", id)).error);
    else {
      const { data, error } = await supabase.from("applications").insert(row).select("id").single();
      dbError(error);
      createdId = data!.id;
    }
    revalidateCatalogue();
    return "Application saved";
  });
  if (createdId) redirect(`/admin/applications/${createdId}`);
  return result;
}

export async function deleteApplication(id: string, _prev: ActionState): Promise<ActionState> {
  const result = await runAction(async () => {
    const { supabase } = await assertRole(CATALOGUE_ROLES);
    dbError((await supabase.from("applications").delete().eq("id", id)).error);
    revalidateCatalogue();
  });
  if (result.ok) redirect("/admin/applications");
  return result;
}

/* ================================================================== */
/* Resources                                                           */
/* ================================================================== */

export async function saveResource(id: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  let createdId: string | null = null;
  const result = await runAction(async () => {
    const { supabase } = await assertRole(CATALOGUE_ROLES);
    const storagePath = str(fd, "storage_path", { required: true, max: 500 });
    const row = {
      title: str(fd, "title", { required: true, max: 200 }),
      type: oneOf(fd, "type", RESOURCE_TYPES),
      description: optStr(fd, "description", 600),
      storage_path: storagePath,
      file_size: Number(fd.get("file_size")) || Number(fd.get("file_size_existing")) || null,
      mime_type: optStr(fd, "mime_type", 100) ?? optStr(fd, "mime_type_existing", 100) ?? guessMime(storagePath),
      issuer: optStr(fd, "issuer", 200),
      certificate_number: optStr(fd, "certificate_number", 100),
      valid_from: date(fd, "valid_from"),
      valid_to: date(fd, "valid_to"),
      is_published: bool(fd, "is_published"),
      sort_order: int(fd, "sort_order"),
    };
    let resourceId = id;
    if (id) dbError((await supabase.from("resources").update(row).eq("id", id)).error);
    else {
      const { data, error } = await supabase.from("resources").insert(row).select("id").single();
      dbError(error);
      resourceId = createdId = data!.id;
    }
    const products = ids(fd, "products");
    dbError((await supabase.from("product_resources").delete().eq("resource_id", resourceId!)).error);
    if (products.length)
      dbError((await supabase.from("product_resources").insert(products.map((p) => ({ product_id: p, resource_id: resourceId! })))).error);
    revalidateCatalogue();
    return "Resource saved";
  });
  if (createdId) redirect(`/admin/resources/${createdId}?created=1`);
  return result;
}

export async function deleteResource(id: string, _prev: ActionState): Promise<ActionState> {
  const result = await runAction(async () => {
    const { supabase } = await assertRole(CATALOGUE_ROLES);
    const { data } = await supabase.from("resources").select("storage_path").eq("id", id).single();
    dbError((await supabase.from("resources").delete().eq("id", id)).error);
    if (data?.storage_path && !data.storage_path.startsWith("/") && !/^https?:/.test(data.storage_path)) {
      await supabase.storage.from("documents").remove([data.storage_path]);
    }
    revalidateCatalogue();
  });
  if (result.ok) redirect("/admin/resources");
  return result;
}

/* ================================================================== */
/* FAQs                                                                */
/* ================================================================== */

export async function saveFaq(id: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const { supabase } = await assertRole(CATALOGUE_ROLES);
    const categoryId = String(fd.get("category_id") ?? "");
    const row = {
      question: str(fd, "question", { required: true, max: 300 }),
      answer_md: str(fd, "answer_md", { required: true, max: 5000 }),
      category_id: UUID.test(categoryId) ? categoryId : null,
      sort_order: int(fd, "sort_order"),
      is_published: bool(fd, "is_published"),
    };
    if (id) dbError((await supabase.from("faqs").update(row).eq("id", id)).error);
    else dbError((await supabase.from("faqs").insert(row)).error);
    revalidateCatalogue();
    return id ? "FAQ saved" : "FAQ added";
  });
}

export async function deleteFaq(id: string, _prev: ActionState): Promise<ActionState> {
  return runAction(async () => {
    const { supabase } = await assertRole(CATALOGUE_ROLES);
    dbError((await supabase.from("faqs").delete().eq("id", id)).error);
    revalidateCatalogue();
    return "FAQ deleted";
  });
}

/**
 * Copy a product — with its models, specification values, images and links — as a new draft.
 * Handy for families that differ in only a few models or values.
 */
export async function duplicateProduct(id: string): Promise<ActionState> {
  let newId: string | null = null;
  const result = await runAction(async () => {
    const { supabase } = await assertRole(CATALOGUE_ROLES);
    if (!UUID.test(id)) throw new Error("Product not found.");
    const { data: p, error } = await supabase.from("products").select("*").eq("id", id).single();
    if (error || !p) throw new Error("Product not found.");

    // A free slug: name-copy, name-copy-2, …
    const { data: taken } = await supabase.from("products").select("slug").like("slug", `${p.slug}-copy%`);
    const used = new Set((taken ?? []).map((r) => r.slug as string));
    let slugCopy = `${p.slug}-copy`;
    for (let n = 2; used.has(slugCopy); n++) slugCopy = `${p.slug}-copy-${n}`;

    const { id: _id, created_at: _c, updated_at: _u, published_at: _p, search_vector: _s, legacy_path: _l, ...rest } = p;
    const { data: copy, error: insErr } = await supabase
      .from("products")
      .insert({ ...rest, name: `${p.name} (copy)`, slug: slugCopy, status: "draft", is_featured: false })
      .select("id")
      .single();
    dbError(insErr);
    if (!copy) throw new Error("Could not copy the product.");
    newId = copy.id as string;

    const [{ data: models }, { data: images }, { data: apps }, { data: related }, { data: res }] = await Promise.all([
      supabase.from("product_models").select("id, model_code, name, status, sort_order, group_label, model_spec_values(attribute_id, value_text, value_num, value_num_max)").eq("product_id", id),
      supabase.from("product_images").select("storage_path, alt_text, sort_order, is_primary").eq("product_id", id),
      supabase.from("product_applications").select("application_id").eq("product_id", id),
      supabase.from("related_products").select("related_product_id, sort_order").eq("product_id", id),
      supabase.from("product_resources").select("resource_id").eq("product_id", id),
    ]);

    for (const m of models ?? []) {
      const { data: nm, error: mErr } = await supabase
        .from("product_models")
        .insert({ product_id: newId, model_code: m.model_code, name: m.name, status: m.status, sort_order: m.sort_order, group_label: m.group_label })
        .select("id")
        .single();
      dbError(mErr);
      if (!nm) throw new Error("Could not copy a model.");
      const values = (m.model_spec_values as { attribute_id: string; value_text: string | null; value_num: number | null; value_num_max: number | null }[]) ?? [];
      if (values.length) {
        const { error: vErr } = await supabase.from("model_spec_values").insert(values.map((v) => ({ ...v, model_id: nm.id })));
        dbError(vErr);
      }
    }
    const copies = [
      images?.length && supabase.from("product_images").insert(images.map((i) => ({ ...i, product_id: newId }))),
      apps?.length && supabase.from("product_applications").insert(apps.map((a) => ({ ...a, product_id: newId }))),
      related?.length && supabase.from("related_products").insert(related.filter((r) => r.related_product_id !== newId).map((r) => ({ ...r, product_id: newId }))),
      res?.length && supabase.from("product_resources").insert(res.map((r) => ({ ...r, product_id: newId }))),
    ].filter(Boolean);
    for (const c of await Promise.all(copies)) {
      if (c && "error" in c) dbError(c.error);
    }
    revalidateCatalogue();
  });
  if (result.ok && newId) redirect(`/admin/products/${newId}?duplicated=1`);
  return result;
}
