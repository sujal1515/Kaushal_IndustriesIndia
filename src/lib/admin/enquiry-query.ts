import "server-only";
import { istDayBounds } from "./dates";

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
  priority?: string;
  owner?: string;
  source?: string;
  follow?: string;
  tag?: string;
  sort?: string;
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
    priority: one(sp.priority),
    owner: one(sp.owner),
    source: one(sp.source).slice(0, 30),
    follow: one(sp.follow),
    tag: one(sp.tag).trim().toLowerCase().slice(0, 30),
    sort: one(sp.sort),
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Shared by the list, the board and the CSV export so all apply identical filters. */
export function applyEnquiryFilters(query: FilterBuilder, f: EnquiryFilters, me?: string): FilterBuilder {
  let r = query;
  if (f.type && ["rfq", "contact", "distributor"].includes(f.type)) r = r.eq("type", f.type);
  if (f.status === "open") r = r.in("status", ["new", "contacted", "quoted"]);
  else if (f.status && ["new", "contacted", "quoted", "won", "lost", "spam"].includes(f.status)) r = r.eq("status", f.status);
  else r = r.neq("status", "spam");
  if (f.notify === "failed") r = r.not("notify_error", "is", null);
  if (f.priority && ["low", "normal", "high", "urgent"].includes(f.priority)) r = r.eq("priority", f.priority);
  if (f.owner === "me" && me) r = r.eq("assigned_to", me);
  else if (f.owner === "none") r = r.is("assigned_to", null);
  else if (f.owner && UUID.test(f.owner)) r = r.eq("assigned_to", f.owner);
  if (f.source && /^[a-z-]+$/.test(f.source)) r = r.eq("source", f.source);
  if (f.tag && /^[a-z0-9 -]+$/.test(f.tag)) r = r.contains("tags", [f.tag]);
  if (f.follow) {
    const today = istDayBounds();
    if (f.follow === "overdue") r = r.lt("follow_up_at", today.start);
    else if (f.follow === "today") r = r.gte("follow_up_at", today.start).lte("follow_up_at", today.end);
    else if (f.follow === "upcoming") r = r.gt("follow_up_at", today.end);
    else if (f.follow === "none") r = r.is("follow_up_at", null);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(f.from ?? "")) r = r.gte("created_at", `${f.from}T00:00:00Z`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(f.to ?? "")) r = r.lte("created_at", `${f.to}T23:59:59Z`);
  if (f.q) {
    const safe = f.q.replace(/[%,()*]/g, " ");
    r = r.or(
      ["reference", "name", "email", "company", "phone", "product_name_snapshot", "model_code_snapshot"].map((c) => `${c}.ilike.%${safe}%`).join(","),
    );
  }
  return r;
}

/** Sort order for the list. */
export function applyEnquirySort(query: FilterBuilder, sort?: string): FilterBuilder {
  switch (sort) {
    case "oldest":
      return query.order("created_at", { ascending: true });
    case "follow_up":
      return query.order("follow_up_at", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false });
    case "value":
      return query.order("estimated_value", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
    case "activity":
      return query.order("last_activity_at", { ascending: false });
    default:
      return query.order("created_at", { ascending: false });
  }
}
