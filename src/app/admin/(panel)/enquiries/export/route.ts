import { NextResponse, type NextRequest } from "next/server";
import { ENQUIRY_ROLES, getStaff } from "@/lib/admin/auth";
import { createSessionClient } from "@/lib/supabase/clients";
import { applyEnquiryFilters, parseFilters } from "@/lib/admin/enquiry-query";
import { countryName } from "@/lib/enquiry/options";

const COLUMNS = [
  "reference", "created_at", "type", "status", "priority", "source", "follow_up_at", "estimated_value", "currency", "tags", "lost_reason", "name", "company", "email", "phone", "buyer_country", "buyer_type",
  "product_name_snapshot", "model_code_snapshot", "quantity", "quantity_unit", "application_other",
  "destination_country", "destination_city_port", "timeline", "message", "source_url", "utm_source", "utm_medium",
  "utm_campaign", "notify_sent_at", "notify_error",
] as const;

const cell = (v: unknown) => {
  let s = v === null || v === undefined ? "" : String(v);
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET(request: NextRequest) {
  const staff = await getStaff();
  if (!staff || !ENQUIRY_ROLES.includes(staff.role)) return new NextResponse("Forbidden", { status: 403 });

  const filters = parseFilters(Object.fromEntries(request.nextUrl.searchParams));
  const supabase = await createSessionClient();
  const { data, error } = await applyEnquiryFilters(supabase.from("enquiries").select(COLUMNS.join(",")), filters, staff.id)
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) return new NextResponse(error.message, { status: 500 });

  const lines = [
    COLUMNS.join(","),
    ...((data ?? []) as Record<string, unknown>[]).map((r) =>
      COLUMNS.map((c) =>
        cell(
          c === "buyer_country" || c === "destination_country"
            ? countryName(r[c] as string) || r[c]
            : Array.isArray(r[c])
              ? (r[c] as string[]).join("; ")
              : r[c],
        ),
      ).join(","),
    ),
  ];
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kaushal-enquiries-${stamp}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
