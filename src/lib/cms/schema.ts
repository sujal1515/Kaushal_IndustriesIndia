/**
 * CMS content model.
 *
 * Each editable page is described by sections of fields. The same description drives the admin
 * editor (which renders a form from it), validation of what editors save, and the public pages
 * (which read typed content merged over code defaults). Pages therefore render identically until
 * something is edited, and a field added in code later simply shows its default.
 */

type Base = { key: string; label: string; hint?: string };

export type TextField = Base & { type: "text"; max?: number };
export type TextareaField = Base & { type: "textarea"; rows?: number; max?: number };
export type MarkdownField = Base & { type: "markdown"; rows?: number };
/** An image path: a site path ("/images/…") or a media-library path in the site-media bucket. */
export type ImageField = Base & { type: "image" };
/** { label, href } */
export type LinkField = Base & { type: "link" };
/** One of a fixed set of options. */
export type SelectField = Base & { type: "select"; options: { value: string; label: string }[] };
/** A list of short strings. */
export type StringsField = Base & { type: "strings"; itemLabel?: string; max?: number };
/** A repeatable group of fields. `titleKey` names the field shown as each item's title. */
export type ListField = Base & { type: "list"; itemLabel: string; titleKey?: string; fields: Field[]; max?: number };

export type Field = TextField | TextareaField | MarkdownField | ImageField | LinkField | SelectField | StringsField | ListField;

export type Section = { key: string; label: string; description?: string; fields: Field[] };

export type PageGroup = "Pages" | "Forms & system pages" | "Legal" | "Site-wide";

export type PageDef<C extends Record<string, Record<string, unknown>> = Record<string, Record<string, unknown>>> = {
  key: string;
  label: string;
  /** Public path to preview, or null for site-wide content. */
  path: string | null;
  group: PageGroup;
  description?: string;
  sections: Section[];
  defaults: C;
};

export type Link = { label: string; href: string };

/* ------------------------------------------------------------------ */
/* Builders                                                            */
/* ------------------------------------------------------------------ */

export const text = (key: string, label: string, hint?: string, max = 300): TextField => ({ type: "text", key, label, hint, max });
export const textarea = (key: string, label: string, hint?: string, rows = 3): TextareaField => ({ type: "textarea", key, label, hint, rows, max: 2000 });
export const markdown = (key: string, label: string, hint?: string, rows = 14): MarkdownField => ({ type: "markdown", key, label, hint, rows });
export const image = (key: string, label: string, hint?: string): ImageField => ({ type: "image", key, label, hint });
export const link = (key: string, label: string, hint?: string): LinkField => ({ type: "link", key, label, hint });
export const select = (key: string, label: string, options: { value: string; label: string }[], hint?: string): SelectField => ({ type: "select", key, label, options, hint });
export const strings = (key: string, label: string, itemLabel = "Item", hint?: string): StringsField => ({ type: "strings", key, label, itemLabel, hint, max: 40 });
export const list = (key: string, label: string, itemLabel: string, fields: Field[], opts: { titleKey?: string; hint?: string; max?: number } = {}): ListField => ({
  type: "list",
  key,
  label,
  itemLabel,
  fields,
  titleKey: opts.titleKey ?? fields[0]?.key,
  hint: opts.hint,
  max: opts.max ?? 40,
});

/** Standard search-engine fields for a page. */
export const seoSection = (): Section => ({
  key: "seo",
  label: "Search engines",
  description: "The title and description shown in Google results and when the page is shared.",
  fields: [text("title", "Page title", "About 50–60 characters.", 120), textarea("description", "Meta description", "About 150–160 characters.", 3)],
});

export const definePage = <C extends Record<string, Record<string, unknown>>>(def: PageDef<C>) => def;

/* ------------------------------------------------------------------ */
/* Validation: keep only known fields, coerce types, cap sizes         */
/* ------------------------------------------------------------------ */

const LIMIT = { text: 300, textarea: 4000, markdown: 40000 };
const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\r\n/g, "\n").slice(0, max) : undefined);

/** Image paths: site paths or bucket object paths only — never javascript:, data: or other schemes. */
export const safeImagePath = (v: unknown) => {
  const s = str(v, 500)?.trim() ?? "";
  if (!s) return "";
  if (/^https:\/\//i.test(s)) return s;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s) || s.startsWith("//")) return "";
  return s;
};

/** Link targets: site paths, anchors, http(s), mailto and tel only. */
export const safeHref = (v: unknown) => {
  const s = str(v, 500)?.trim() ?? "";
  if (/^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)/i.test(s)) return s;
  return "";
};

function cleanField(f: Field, v: unknown): unknown {
  switch (f.type) {
    case "text":
      return str(v, f.max ?? LIMIT.text);
    case "textarea":
      return str(v, f.max ?? LIMIT.textarea);
    case "markdown":
      return str(v, LIMIT.markdown);
    case "image":
      return safeImagePath(v);
    case "link": {
      const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
      return { label: str(o.label, LIMIT.text) ?? "", href: safeHref(o.href) };
    }
    case "select": {
      const s = str(v, 100);
      return s !== undefined && f.options.some((o) => o.value === s) ? s : undefined;
    }
    case "strings":
      return Array.isArray(v)
        ? v.map((x) => str(x, LIMIT.text)).filter((x): x is string => x !== undefined).slice(0, f.max ?? 40)
        : undefined;
    case "list":
      return Array.isArray(v)
        ? v
            .filter((x) => x && typeof x === "object")
            .slice(0, f.max ?? 40)
            .map((item) => cleanFields(f.fields, item as Record<string, unknown>))
        : undefined;
  }
}

function cleanFields(fields: Field[], input: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (!(f.key in input)) continue;
    const v = cleanField(f, input[f.key]);
    if (v !== undefined) out[f.key] = v;
  }
  return out;
}

/** Validates content against a page definition; unknown sections and fields are dropped. */
export function validateContent(def: PageDef, input: unknown): Record<string, Record<string, unknown>> {
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out: Record<string, Record<string, unknown>> = {};
  for (const s of def.sections) {
    const sec = src[s.key];
    if (sec && typeof sec === "object") out[s.key] = cleanFields(s.fields, sec as Record<string, unknown>);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Merging stored content over defaults                                */
/* ------------------------------------------------------------------ */

const isPlain = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Deep merge: stored values win; arrays replace the default list; missing fields keep defaults. */
export function mergeContent<T>(defaults: T, stored: unknown): T {
  if (!isPlain(defaults) || !isPlain(stored)) return (stored === undefined || stored === null ? defaults : (stored as T)) ?? defaults;
  const out: Record<string, unknown> = { ...defaults };
  for (const [k, v] of Object.entries(stored)) {
    if (v === undefined || v === null) continue;
    const d = (defaults as Record<string, unknown>)[k];
    if (isPlain(d) && isPlain(v)) out[k] = mergeContent(d, v);
    else if (d === undefined || typeof d === typeof v || (Array.isArray(d) && Array.isArray(v))) out[k] = v;
  }
  return out as T;
}

/** Replaces {tokens} in copy, e.g. "Quote for the {product}". Unknown tokens are left as written. */
export function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
}
