import Link from "next/link";
import { formatNumber, formatSpec } from "@/lib/data/catalogue";
import type { ProductModel, ProductSummary, SpecAttribute } from "@/lib/types";
import { slugify } from "@/lib/utils";
import { AutoSubmitForm } from "./auto-submit-form";
import { productHref } from "./product-card";

type Row = { model: ProductModel; product: ProductSummary };
export type FinderParams = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Attribute-driven filters (blueprint §4.4): product facets, configuration, and numeric attributes flagged `is_filterable`. */
export function buildFilters(rows: Row[], attributes: SpecAttribute[]) {
  const facetKeys = [...new Set(rows.flatMap((r) => Object.keys(r.product.facets)))];
  const facets = facetKeys.map((key) => ({
    key,
    param: `f_${slugify(key).replace(/-/g, "_")}`,
    values: [...new Set(rows.map((r) => r.product.facets[key]).filter(Boolean))].sort(),
  }));
  const configs = [...new Set(rows.map((r) => r.model.group_label).filter((g): g is string => !!g))];
  const numeric = attributes
    .filter((a) => a.is_filterable && a.data_type === "number")
    .map((a) => ({
      attr: a,
      values: [...new Set(rows.map((r) => r.model.specs[a.key]?.num).filter((n): n is number => typeof n === "number"))].sort(
        (x, y) => x - y,
      ),
    }))
    .filter((n) => n.values.length > 1);
  return { facets, configs, numeric };
}

export function applyFilters(rows: Row[], attributes: SpecAttribute[], params: FinderParams) {
  const { facets, numeric } = buildFilters(rows, attributes);
  const config = one(params.config);
  return rows.filter((r) => {
    for (const f of facets) {
      const want = one(params[f.param]);
      if (want && r.product.facets[f.key] !== want) return false;
    }
    if (config && r.model.group_label !== config) return false;
    for (const n of numeric) {
      const v = r.model.specs[n.attr.key]?.num;
      const min = Number(one(params[`${n.attr.key}_min`]));
      const max = Number(one(params[`${n.attr.key}_max`]));
      if (one(params[`${n.attr.key}_min`]) && (v === null || v === undefined || v < min)) return false;
      if (one(params[`${n.attr.key}_max`]) && (v === null || v === undefined || v > max)) return false;
    }
    return true;
  });
}

export function hasActiveFilters(params: FinderParams) {
  return Object.entries(params).some(([k, v]) => (k === "config" || k.startsWith("f_") || /_(min|max)$/.test(k)) && one(v));
}

export function ModelFinder({
  rows,
  attributes,
  params,
  basePath,
}: {
  rows: Row[];
  attributes: SpecAttribute[];
  params: FinderParams;
  basePath: string;
}) {
  const { facets, configs, numeric } = buildFilters(rows, attributes);
  const results = applyFilters(rows, attributes, params);
  const keyAttrs = attributes.filter((a) => a.is_key_spec).slice(0, 3);
  const active = hasActiveFilters(params);

  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-16 [&>*]:min-w-0">
      <AutoSubmitForm
        action={`${basePath}#model-finder`}
        className="no-print grid content-start gap-8 lg:sticky lg:top-24 lg:col-span-3"
        aria-label="Filter models"
      >
        {facets.map((f) => (
          <label key={f.param} className="grid gap-1">
            <span className="form-label">{f.key}</span>
            <select name={f.param} defaultValue={one(params[f.param])} className="form-input">
              <option value="">Any</option>
              {f.values.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        ))}
        {configs.length > 1 && (
          <label className="grid gap-1">
            <span className="form-label">Configuration</span>
            <select name="config" defaultValue={one(params.config)} className="form-input">
              <option value="">Any</option>
              {configs.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        )}
        {numeric.map((n) => (
          <fieldset key={n.attr.key} className="grid gap-1">
            <legend className="form-label mb-1">
              {n.attr.label} {n.attr.unit && <span className="text-muted">({n.attr.unit})</span>}
            </legend>
            <div className="grid grid-cols-2 gap-4">
              <select
                name={`${n.attr.key}_min`}
                defaultValue={one(params[`${n.attr.key}_min`])}
                className="form-input"
                aria-label={`Minimum ${n.attr.label}`}
              >
                <option value="">Min</option>
                {n.values.map((v) => (
                  <option key={v} value={v}>
                    {formatNumber(v)}
                  </option>
                ))}
              </select>
              <select
                name={`${n.attr.key}_max`}
                defaultValue={one(params[`${n.attr.key}_max`])}
                className="form-input"
                aria-label={`Maximum ${n.attr.label}`}
              >
                <option value="">Max</option>
                {n.values.map((v) => (
                  <option key={v} value={v}>
                    {formatNumber(v)}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>
        ))}
        <div className="flex items-center gap-4 pt-1">
          <button type="submit" className="js-hide rounded-[0.25rem] bg-ink px-5 py-3 text-[1rem] font-semibold text-white">
            Apply filters
          </button>
          {active && (
            <Link href={`${basePath}#model-finder`} scroll={false} className="u-link font-mono text-[0.875rem] font-medium uppercase text-ink hover:text-accent">
              Clear filters
            </Link>
          )}
        </div>
      </AutoSubmitForm>

      <div className="lg:col-span-9">
        <p className="mb-5 font-mono text-[0.875rem] font-medium uppercase text-muted" aria-live="polite">
          {results.length} of {rows.length} models
        </p>
        <div className="scroll-shadow overflow-x-auto [contain:paint] border-y border-line" data-grid-draw="cells rows:tr" role="region" aria-label="Matching models" tabIndex={0}>
          <table className="w-full min-w-[640px] border-collapse text-[1rem]">
            <caption className="sr-only">Models matching the selected filters</caption>
            <thead>
              <tr className="border-b border-line text-left">
                <th scope="col" className="py-4 pl-0 pr-5 font-mono text-[0.875rem] font-medium uppercase text-accent">Model</th>
                <th scope="col" className="px-5 py-4 font-mono text-[0.875rem] font-medium uppercase text-accent">Family</th>
                <th scope="col" className="px-5 py-4 font-mono text-[0.875rem] font-medium uppercase text-accent">Configuration</th>
                {keyAttrs.map((a) => (
                  <th key={a.key} scope="col" className="px-5 py-4 font-mono text-[0.875rem] font-medium uppercase text-accent">
                    {a.label} {a.unit && <span className="text-[0.75rem] normal-case text-muted">{a.unit}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map(({ model, product }) => (
                <tr key={model.id} className="border-b border-line transition-colors last:border-0 hover:bg-stone">
                  <th scope="row" className="py-4 pl-0 pr-5 text-left">
                    <Link href={`${productHref(product)}#model-${model.model_code}`} className="u-link font-mono font-medium text-accent">
                      {model.model_code}
                    </Link>
                  </th>
                  <td className="px-5 py-4 font-medium">
                    <Link href={productHref(product)} className="u-link">
                      {product.name.replace(/ Diesel Engine$/, "")}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-muted">{model.group_label ?? "—"}</td>
                  {keyAttrs.map((a) => (
                    <td key={a.key} className="px-5 py-4 font-medium tabular-nums">
                      {formatSpec(model.specs[a.key], null)}
                    </td>
                  ))}
                </tr>
              ))}
              {results.length === 0 && (
                <tr>
                  <td colSpan={3 + keyAttrs.length} className="px-4 py-12 text-center text-[1.125rem] text-muted">
                    No models match these filters.{" "}
                    <Link href={`${basePath}#model-finder`} className="text-ink underline underline-offset-4">
                      Clear filters
                    </Link>{" "}
                    or{" "}
                    <Link href="/request-a-quote" className="text-ink underline underline-offset-4">
                      ask us for a custom rating
                    </Link>
                    .
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
