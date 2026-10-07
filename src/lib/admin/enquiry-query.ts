import "server-only";

// PostgREST filter builders have deeply generic types; a loose alias keeps this helper readable.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FilterBuilder = any;

export type EnquiryFilters = {
  type?: string;
  status?: string;
  q?: string;
  from?: string;
  to?: string;
  notify?: string;
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseFilters(sp: Record<string, string | string[] | undefined>): EnquiryFilters {
  return {
    type: one(sp.type),
    status: one(sp.status),
    q: one(sp.q).trim().slice(0, 100),
    from: one(sp.from),
    to: one(sp.to),
    notify: one(sp.notify),
  };
}

/** Shared by the list page and CSV export so both apply identical filters. */
export function applyEnquiryFilters(query: FilterBuilder, f: EnquiryFilters): FilterBuilder {
  let r = query;
  if (f.type && ["rfq", "contact", "distributor"].includes(f.type)) r = r.eq("type", f.type);
  if (f.status && ["new", "contacted", "quoted", "won", "lost", "spam"].includes(f.status)) r = r.eq("status", f.status);
  else r = r.neq("status", "spam");
  if (f.notify === "failed") r = r.not("notify_error", "is", null);
  if (/^\d{4}-\d{2}-\d{2}$/.test(f.from ?? "")) r = r.gte("created_at", `${f.from}T00:00:00Z`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(f.to ?? "")) r = r.lte("created_at", `${f.to}T23:59:59Z`);
  if (f.q) {
    const safe = f.q.replace(/[%,()*]/g, " ");
    r = r.or(
      ["reference", "name", "email", "company", "product_name_snapshot", "model_code_snapshot"].map((c) => `${c}.ilike.%${safe}%`).join(","),
    );
  }
  return r;
}
