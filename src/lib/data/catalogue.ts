import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/clients";
import { isSupabaseConfigured, mediaUrl } from "@/lib/env";
import { site } from "@/lib/site";
import type {
  Application,
  Category,
  Faq,
  LabelValue,
  Product,
  ProductDetail,
  ProductImage,
  ProductModel,
  ProductSummary,
  PublishStatus,
  Resource,
  SiteSettings,
  SpecAttribute,
} from "@/lib/types";
import {
  seedApplications,
  seedAttributes,
  seedCategories,
  seedFaqs,
  seedProducts,
  seedResources,
} from "./seed";

export const CATALOGUE_TAG = "catalogue";

/** Statuses that are visible on the public site. Drafts are never shown. */
const LISTED: PublishStatus[] = ["published", "coming_soon"];
const REACHABLE: PublishStatus[] = ["published", "coming_soon", "discontinued"];

type ImageRow = ProductImage & { product_id: string };

export interface Catalogue {
  source: "supabase" | "seed";
  categories: Category[];
  attributes: SpecAttribute[];
  products: Product[];
  models: ProductModel[];
  images: ImageRow[];
  applications: Application[];
  productApplications: { product_id: string; application_id: string }[];
  related: { product_id: string; related_product_id: string; sort_order: number }[];
  resources: Resource[];
  productResources: { product_id: string; resource_id: string }[];
  faqs: Faq[];
  settings: SiteSettings;
}

export const defaultSettings: SiteSettings = {
  notification_emails: [],
  phones: [...site.contact.phones],
  whatsapp: site.contact.whatsapp,
  email: site.contact.email,
  address_lines: [...site.contact.addressLines],
};

/* ------------------------------------------------------------------ */
/* Snapshot loading                                                     */
/* ------------------------------------------------------------------ */

const NOW = "2026-10-04T00:00:00.000Z";

function buildSeedCatalogue(): Catalogue {
  const categories: Category[] = seedCategories.map((c) => ({
    id: c.slug,
    slug: c.slug,
    name: c.name,
    description: c.description,
    image_path: c.image_path,
    sort_order: c.sort_order,
    status: c.status,
    seo_title: c.seo_title ?? null,
    seo_description: c.seo_description ?? null,
    updated_at: NOW,
  }));

  const attributes: SpecAttribute[] = Object.entries(seedAttributes).flatMap(([cat, attrs]) =>
    attrs.map((a, i) => ({ id: `${cat}:${a.key}`, category_id: cat, sort_order: i + 1, ...a })),
  );

  const products: Product[] = [];
  const models: ProductModel[] = [];
  const images: ImageRow[] = [];
  const productApplications: Catalogue["productApplications"] = [];
  const related: Catalogue["related"] = [];

  for (const p of seedProducts) {
    products.push({
      id: p.slug,
      category_id: p.category,
      slug: p.slug,
      name: p.name,
      subtitle: p.subtitle,
      summary: p.summary,
      description_md: p.description_md,
      status: p.status,
      is_featured: p.is_featured,
      sort_order: p.sort_order,
      facets: p.facets,
      highlights: p.highlights,
      descriptive_specs: p.descriptive_specs,
      standard_equipment: p.standard_equipment,
      optional_extras: p.optional_extras,
      notes: p.notes,
      seo_title: null,
      seo_description: null,
      legacy_path: p.legacy_path,
      updated_at: NOW,
    });
    p.models.forEach((m, i) => {
      const specs: ProductModel["specs"] = {};
      for (const [k, v] of Object.entries(m.values)) {
        specs[k] = typeof v === "number" ? { text: null, num: v } : { text: v, num: null };
      }
      models.push({
        id: `${p.slug}:${m.code}`,
        product_id: p.slug,
        model_code: m.code,
        name: null,
        status: "published",
        sort_order: i + 1,
        group_label: m.group,
        specs,
      });
    });
    p.images.forEach((img, i) =>
      images.push({
        id: `${p.slug}:img${i}`,
        product_id: p.slug,
        storage_path: img.path,
        alt_text: img.alt,
        sort_order: i + 1,
        is_primary: i === 0,
      }),
    );
    p.applications.forEach((a) => productApplications.push({ product_id: p.slug, application_id: a }));
    p.related.forEach((r, i) => related.push({ product_id: p.slug, related_product_id: r, sort_order: i + 1 }));
  }

  const applications: Application[] = seedApplications.map((a) => ({
    id: a.slug,
    slug: a.slug,
    name: a.name,
    summary: a.summary,
    body_md: a.body_md,
    image_path: a.image_path,
    sort_order: a.sort_order,
    status: "published",
    seo_title: null,
    seo_description: null,
    updated_at: NOW,
  }));

  const resources: Resource[] = seedResources.map((r, i) => ({
    id: `res${i + 1}`,
    title: r.title,
    type: r.type,
    description: r.description,
    storage_path: r.storage_path,
    file_size: r.file_size,
    mime_type: r.mime_type,
    language: "en",
    is_published: true,
    valid_from: r.valid_from,
    valid_to: r.valid_to,
    issuer: r.issuer,
    certificate_number: null,
    sort_order: r.sort_order,
    updated_at: NOW,
  }));
  const productResources = seedResources.flatMap((r, i) =>
    r.products.map((p) => ({ product_id: p, resource_id: `res${i + 1}` })),
  );

  const faqs: Faq[] = seedFaqs.map((f, i) => ({
    id: `faq${i + 1}`,
    question: f.question,
    answer_md: f.answer_md,
    category_id: f.category,
    product_id: f.product,
    sort_order: f.sort_order,
    is_published: true,
  }));

  return {
    source: "seed",
    categories,
    attributes,
    products,
    models,
    images,
    applications,
    productApplications,
    related,
    resources,
    productResources,
    faqs,
    settings: defaultSettings,
  };
}

async function loadFromSupabase(): Promise<Catalogue> {
  const sb = createPublicClient()!;
  const q = <T>(p: PromiseLike<{ data: T[] | null; error: { message: string } | null }>) =>
    Promise.resolve(p).then(({ data, error }) => {
      if (error) throw new Error(`Supabase: ${error.message}`);
      return data ?? [];
    });

  const [
    categories,
    attributes,
    products,
    modelRows,
    images,
    applications,
    productApplications,
    related,
    resources,
    productResources,
    faqs,
    settingsRows,
  ] = await Promise.all([
    q<Category>(sb.from("categories").select("*").order("sort_order")),
    q<SpecAttribute>(sb.from("spec_attributes").select("*").order("sort_order")),
    q<Product>(sb.from("products").select("*").order("sort_order")),
    q<
      Omit<ProductModel, "specs"> & {
        model_spec_values: { attribute_id: string; value_text: string | null; value_num: number | null }[];
      }
    >(sb.from("product_models").select("*, model_spec_values(attribute_id, value_text, value_num)").order("sort_order")),
    q<ImageRow>(sb.from("product_images").select("*").order("sort_order")),
    q<Application>(sb.from("applications").select("*").order("sort_order")),
    q<{ product_id: string; application_id: string }>(sb.from("product_applications").select("product_id, application_id")),
    q<{ product_id: string; related_product_id: string; sort_order: number }>(
      sb.from("related_products").select("product_id, related_product_id, sort_order").order("sort_order"),
    ),
    q<Resource>(sb.from("resources").select("*").order("sort_order")),
    q<{ product_id: string; resource_id: string }>(sb.from("product_resources").select("product_id, resource_id")),
    q<Faq>(sb.from("faqs").select("*").order("sort_order")),
    q<{ key: string; value: unknown }>(sb.from("site_settings").select("key, value")),
  ]);

  const attrKey = new Map(attributes.map((a) => [a.id, a.key]));
  const models: ProductModel[] = modelRows.map(({ model_spec_values, ...m }) => {
    const specs: ProductModel["specs"] = {};
    for (const v of model_spec_values ?? []) {
      const key = attrKey.get(v.attribute_id);
      if (key) specs[key] = { text: v.value_text, num: v.value_num === null ? null : Number(v.value_num) };
    }
    return { ...m, specs };
  });

  const settings: SiteSettings = { ...defaultSettings };
  for (const row of settingsRows) {
    if (row.key in settings && row.value !== null && row.value !== undefined) {
      (settings as unknown as Record<string, unknown>)[row.key] = row.value;
    }
  }

  return {
    source: "supabase",
    categories,
    attributes,
    products: products.map(normaliseProduct),
    models,
    images,
    applications,
    productApplications,
    related,
    resources,
    productResources,
    faqs,
    settings,
  };
}

function normaliseProduct(p: Product): Product {
  return {
    ...p,
    facets: p.facets ?? {},
    highlights: p.highlights ?? [],
    descriptive_specs: p.descriptive_specs ?? [],
    standard_equipment: p.standard_equipment ?? [],
    optional_extras: p.optional_extras ?? [],
    notes: p.notes ?? [],
  };
}

const loadCatalogueCached = unstable_cache(
  async (): Promise<Catalogue> => (isSupabaseConfigured ? loadFromSupabase() : buildSeedCatalogue()),
  ["catalogue-snapshot-v1"],
  { tags: [CATALOGUE_TAG], revalidate: 3600 },
);

export async function getCatalogue(): Promise<Catalogue> {
  if (!isSupabaseConfigured) return buildSeedCatalogue();
  return loadCatalogueCached();
}

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                   */
/* ------------------------------------------------------------------ */

export function formatNumber(n: number) {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

export function formatSpec(value: ProductModel["specs"][string] | undefined, unit?: string | null) {
  if (!value) return "—";
  if (value.num !== null && value.num !== undefined) return `${formatNumber(value.num)}${unit ? ` ${unit}` : ""}`;
  return value.text ?? "—";
}

function rangeLabel(values: number[], unit: string | null) {
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const body = min === max ? formatNumber(min) : `${formatNumber(min)}–${formatNumber(max)}`;
  return unit ? `${body} ${unit}` : body;
}

/** Key specs: ranges computed from model data, plus product-level highlights. */
function computeKeySpecs(product: Product, models: ProductModel[], attributes: SpecAttribute[]): LabelValue[] {
  const out: LabelValue[] = [];
  if (models.length) {
    const byLabel = new Map<string, string[]>();
    for (const a of attributes.filter((x) => x.is_key_spec)) {
      const label = rangeLabel(
        models.map((m) => m.specs[a.key]?.num).filter((n): n is number => typeof n === "number"),
        a.unit,
      );
      if (!label) continue;
      byLabel.set(a.label, [...(byLabel.get(a.label) ?? []), label]);
    }
    for (const [label, values] of byLabel) out.push({ label, value: values.join(" · ") });
    const groups = [...new Set(models.map((m) => m.group_label).filter(Boolean))];
    if (groups.length) out.push({ label: "Configuration", value: groups.join(", ") });
    out.push({ label: "Models", value: String(models.length) });
  }
  for (const h of product.highlights) if (!out.some((o) => o.label === h.label)) out.push(h);
  return out;
}

/* ------------------------------------------------------------------ */
/* Queries                                                              */
/* ------------------------------------------------------------------ */

function summarise(c: Catalogue, p: Product): ProductSummary {
  const category = c.categories.find((x) => x.id === p.category_id);
  const models = c.models.filter((m) => m.product_id === p.id && m.status !== "draft");
  const attributes = c.attributes.filter((a) => a.category_id === p.category_id);
  const imgs = c.images.filter((i) => i.product_id === p.id).sort((a, b) => a.sort_order - b.sort_order);
  const primary = imgs.find((i) => i.is_primary) ?? imgs[0] ?? null;
  return {
    ...p,
    category_slug: category?.slug ?? "",
    category_name: category?.name ?? "",
    primary_image: primary ? stripProductId(primary) : null,
    model_count: models.length,
    key_specs: computeKeySpecs(p, models, attributes),
  };
}

function stripProductId(img: ImageRow): ProductImage {
  const { product_id: _ignored, ...rest } = img;
  void _ignored;
  return rest;
}

const bySort = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order;

export function isResourceCurrent(r: Resource, today = new Date()) {
  if (!r.is_published) return false;
  if (r.valid_to && new Date(r.valid_to) < today) return false;
  if (r.valid_from && new Date(r.valid_from) > today) return false;
  return true;
}

export async function listCategories() {
  const c = await getCatalogue();
  return c.categories
    .filter((x) => LISTED.includes(x.status))
    .sort(bySort)
    .map((cat) => ({
      ...cat,
      product_count: c.products.filter((p) => p.category_id === cat.id && LISTED.includes(p.status)).length,
    }));
}

export async function getCategory(slug: string) {
  const c = await getCatalogue();
  return c.categories.find((x) => x.slug === slug && REACHABLE.includes(x.status)) ?? null;
}

export async function listProducts(opts: { categorySlug?: string; featuredOnly?: boolean } = {}) {
  const c = await getCatalogue();
  const cat = opts.categorySlug ? c.categories.find((x) => x.slug === opts.categorySlug) : null;
  if (opts.categorySlug && !cat) return [];
  const categoryOrder = new Map(c.categories.map((x) => [x.id, x.sort_order]));
  return c.products
    .filter((p) => LISTED.includes(p.status))
    .filter((p) => !cat || p.category_id === cat.id)
    .filter((p) => !opts.featuredOnly || p.is_featured)
    .sort((a, b) => (categoryOrder.get(a.category_id) ?? 0) - (categoryOrder.get(b.category_id) ?? 0) || bySort(a, b))
    .map((p) => summarise(c, p));
}

export async function getProduct(categorySlug: string, productSlug: string): Promise<ProductDetail | null> {
  const c = await getCatalogue();
  const category = c.categories.find((x) => x.slug === categorySlug);
  const product = c.products.find(
    (p) => p.slug === productSlug && p.category_id === category?.id && REACHABLE.includes(p.status),
  );
  if (!category || !product) return null;

  const attributes = c.attributes.filter((a) => a.category_id === category.id).sort(bySort);
  const models = c.models.filter((m) => m.product_id === product.id && m.status !== "draft").sort(bySort);
  const images = c.images
    .filter((i) => i.product_id === product.id)
    .sort(bySort)
    .map(stripProductId);
  const resourceIds = new Set(c.productResources.filter((x) => x.product_id === product.id).map((x) => x.resource_id));
  const resources = c.resources.filter((r) => resourceIds.has(r.id) && isResourceCurrent(r)).sort(bySort);
  const appIds = new Set(c.productApplications.filter((x) => x.product_id === product.id).map((x) => x.application_id));
  const applications = c.applications.filter((a) => appIds.has(a.id) && a.status === "published").sort(bySort);

  // Related: manual selection first, then fall back to the same category (blueprint §4.7).
  const manual = c.related
    .filter((r) => r.product_id === product.id)
    .sort(bySort)
    .map((r) => c.products.find((p) => p.id === r.related_product_id))
    .filter((p): p is Product => !!p && LISTED.includes(p.status));
  const fallback = c.products.filter(
    (p) => p.category_id === product.category_id && p.id !== product.id && LISTED.includes(p.status) && !manual.includes(p),
  );
  const related = [...manual, ...fallback].slice(0, 3).map((p) => summarise(c, p));

  const faqs = c.faqs
    .filter((f) => f.is_published && (f.product_id === product.id || f.category_id === category.id))
    .sort(bySort);

  return {
    ...summarise(c, product),
    category,
    attributes,
    models,
    images,
    resources,
    applications,
    related,
    faqs,
  };
}

/** Flattened model rows across a category, for the model finder. */
export async function listCategoryModels(categorySlug: string) {
  const c = await getCatalogue();
  const category = c.categories.find((x) => x.slug === categorySlug);
  if (!category) return { attributes: [] as SpecAttribute[], rows: [] };
  const attributes = c.attributes.filter((a) => a.category_id === category.id).sort(bySort);
  const products = c.products.filter((p) => p.category_id === category.id && LISTED.includes(p.status));
  const rows = products.flatMap((p) =>
    c.models
      .filter((m) => m.product_id === p.id && m.status !== "draft")
      .sort(bySort)
      .map((m) => ({ model: m, product: summarise(c, p) })),
  );
  return { attributes, rows };
}

export async function listApplications() {
  const c = await getCatalogue();
  return c.applications.filter((a) => a.status === "published").sort(bySort);
}

export async function getApplication(slug: string) {
  const c = await getCatalogue();
  const app = c.applications.find((a) => a.slug === slug && a.status === "published");
  if (!app) return null;
  const ids = new Set(c.productApplications.filter((x) => x.application_id === app.id).map((x) => x.product_id));
  const products = c.products.filter((p) => ids.has(p.id) && LISTED.includes(p.status)).map((p) => summarise(c, p));
  return { ...app, products };
}

export async function listResources() {
  const c = await getCatalogue();
  return c.resources.filter((r) => isResourceCurrent(r)).sort(bySort);
}

export async function listFaqs() {
  const c = await getCatalogue();
  return c.faqs.filter((f) => f.is_published).sort(bySort);
}

export async function getSettings() {
  return (await getCatalogue()).settings;
}

export async function getCatalogueStats() {
  const c = await getCatalogue();
  const listed = c.products.filter((p) => LISTED.includes(p.status));
  const modelCount = c.models.filter((m) => listed.some((p) => p.id === m.product_id) && m.status !== "draft").length;
  return { productCount: listed.length, modelCount, categoryCount: c.categories.filter((x) => LISTED.includes(x.status)).length };
}

/** Engine families with each model's rated power (bhp) and speed, for the power range chart. */
export async function listPowerFamilies(categorySlug = "diesel-engines") {
  const c = await getCatalogue();
  const category = c.categories.find((x) => x.slug === categorySlug);
  if (!category) return [];
  return c.products
    .filter((p) => p.category_id === category.id && LISTED.includes(p.status))
    .sort(bySort)
    .map((p) => ({
      name: p.name,
      href: `/products/${category.slug}/${p.slug}`,
      models: c.models
        .filter((m) => m.product_id === p.id && m.status !== "draft")
        .sort(bySort)
        .map((m) => ({ code: m.model_code, bhp: m.specs.power_bhp?.num ?? null, rpm: m.specs.speed_rpm?.num ?? null }))
        .filter((m): m is { code: string; bhp: number; rpm: number | null } => typeof m.bhp === "number"),
    }))
    .filter((f) => f.models.length > 0);
}

/** Compact index for the instant search overlay (products, model codes and keywords). */
export interface SearchIndexItem {
  name: string;
  href: string;
  category: string;
  image: string | null;
  models: string[];
  keywords: string;
}

export async function getSearchIndex(): Promise<SearchIndexItem[]> {
  const c = await getCatalogue();
  const categoryOrder = new Map(c.categories.map((x) => [x.id, x.sort_order]));
  return c.products
    .filter((p) => LISTED.includes(p.status))
    .sort((a, b) => (categoryOrder.get(a.category_id) ?? 0) - (categoryOrder.get(b.category_id) ?? 0) || bySort(a, b))
    .map((p) => {
      const category = c.categories.find((x) => x.id === p.category_id);
      const appIds = new Set(c.productApplications.filter((x) => x.product_id === p.id).map((x) => x.application_id));
      const apps = c.applications.filter((a) => appIds.has(a.id)).map((a) => a.name);
      const imgs = c.images.filter((i) => i.product_id === p.id).sort(bySort);
      const primary = imgs.find((i) => i.is_primary) ?? imgs[0];
      return {
        name: p.name,
        href: `/products/${category?.slug ?? ""}/${p.slug}`,
        category: category?.name ?? "",
        image: mediaUrl(primary?.storage_path),
        models: c.models
          .filter((m) => m.product_id === p.id && m.status !== "draft")
          .sort(bySort)
          .map((m) => m.model_code),
        keywords: [p.subtitle, category?.name, ...Object.values(p.facets), ...apps].filter(Boolean).join(" "),
      };
    });
}

/* ------------------------------------------------------------------ */
/* Search (in-memory over the cached snapshot)                          */
/* ------------------------------------------------------------------ */

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export interface SearchHit {
  product: ProductSummary;
  matchedModels: string[];
  score: number;
}

export async function searchCatalogue(query: string): Promise<SearchHit[]> {
  const q = norm(query);
  if (q.length < 2) return [];
  const tokens = q.split(" ").filter(Boolean);
  const c = await getCatalogue();
  const hits: SearchHit[] = [];

  for (const p of c.products.filter((x) => LISTED.includes(x.status))) {
    const category = c.categories.find((x) => x.id === p.category_id);
    const appIds = new Set(c.productApplications.filter((x) => x.product_id === p.id).map((x) => x.application_id));
    const apps = c.applications.filter((a) => appIds.has(a.id)).map((a) => a.name);
    const models = c.models.filter((m) => m.product_id === p.id && m.status !== "draft");
    const haystack = norm(
      [p.name, p.subtitle, p.summary, category?.name, ...Object.values(p.facets), ...apps, ...models.map((m) => m.model_code)]
        .filter(Boolean)
        .join(" "),
    );

    let score = 0;
    const matchedModels: string[] = [];
    let allTokensMatch = true;
    for (const t of tokens) {
      const ct = compact(t);
      const modelExact = models.filter((m) => compact(m.model_code) === ct);
      const modelPrefix = models.filter((m) => ct.length >= 2 && compact(m.model_code).startsWith(ct));
      if (modelExact.length) {
        score += 20;
        matchedModels.push(...modelExact.map((m) => m.model_code));
      } else if (modelPrefix.length) {
        score += 8;
        matchedModels.push(...modelPrefix.map((m) => m.model_code));
      }
      if (norm(p.name).includes(t)) score += 6;
      else if (haystack.includes(t)) score += 2;
      else if (!modelExact.length && !modelPrefix.length) allTokensMatch = false;
    }
    if (allTokensMatch && score > 0) {
      hits.push({ product: summarise(c, p), matchedModels: [...new Set(matchedModels)], score });
    }
  }
  return hits.sort((a, b) => b.score - a.score);
}
