/** Lead-management vocabulary shared by the admin screens, actions and exports. */
import type { EnquiryStatus } from "@/lib/types";

export const LEAD_STATUSES: { value: EnquiryStatus; label: string; hint: string }[] = [
  { value: "new", label: "New", hint: "Not yet answered" },
  { value: "contacted", label: "Contacted", hint: "In conversation" },
  { value: "quoted", label: "Quoted", hint: "Quotation sent" },
  { value: "won", label: "Won", hint: "Order received" },
  { value: "lost", label: "Lost", hint: "Did not proceed" },
  { value: "spam", label: "Spam", hint: "Hidden from lists and reports" },
];
export const OPEN_STATUSES: EnquiryStatus[] = ["new", "contacted", "quoted"];
export const statusLabel = (s: string) => LEAD_STATUSES.find((x) => x.value === s)?.label ?? s;

export type LeadPriority = "low" | "normal" | "high" | "urgent";
export const PRIORITIES: { value: LeadPriority; label: string }[] = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Low" },
];
export const priorityTone = (p: string) =>
  (({ urgent: "danger", high: "warn", normal: "neutral", low: "neutral" }) as const)[p as LeadPriority] ?? "neutral";

export const SOURCES = [
  { value: "website", label: "Website form" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "trade-show", label: "Trade show" },
  { value: "referral", label: "Referral" },
  { value: "repeat", label: "Repeat customer" },
  { value: "other", label: "Other" },
] as const;
export const sourceLabel = (s: string) => SOURCES.find((x) => x.value === s)?.label ?? s;

export const CURRENCIES = ["USD", "INR", "EUR", "GBP", "AED"] as const;

export const LOST_REASONS = ["Price", "Lead time", "Specification not available", "Chose a competitor", "No response from buyer", "Project cancelled", "Other"];

/** Short, human-friendly reference: KI-YYMMDD-XXXX (same format as website enquiries). */
export function makeReference(now = new Date()) {
  const ymd = `${String(now.getUTCFullYear()).slice(2)}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  const bytes = crypto.getRandomValues(new Uint8Array(2));
  return `KI-${ymd}-${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

/** Format an amount for display, e.g. "USD 12,500". */
export function formatMoney(value: number | null | undefined, currency = "USD") {
  if (value === null || value === undefined) return null;
  return `${currency} ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value)}`;
}
