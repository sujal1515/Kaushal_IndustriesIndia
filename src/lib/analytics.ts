"use client";

/**
 * GA4 / GTM events (blueprint §9.4). Events are pushed to the GTM dataLayer;
 * the GTM container maps them to GA4 events. Nothing is sent unless GTM is
 * configured and the visitor has granted analytics consent (Consent Mode v2).
 */
export type AnalyticsEvent =
  | "quote_start"
  | "generate_lead"
  | "contact_submit"
  | "contact_click"
  | "file_download"
  | "view_item"
  | "select_item"
  | "search";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export function track(event: AnalyticsEvent, params: Record<string, string | number | undefined> = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}
