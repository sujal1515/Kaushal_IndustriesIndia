"use client";

import Link from "next/link";
import { useEffect, type ComponentProps } from "react";
import { track, type AnalyticsEvent } from "@/lib/analytics";

type Params = Record<string, string | number | undefined>;

/** Next.js Link that pushes an analytics event on click. */
export function TrackedLink({
  event,
  params,
  onClick,
  ...props
}: ComponentProps<typeof Link> & { event: AnalyticsEvent; params?: Params }) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        track(event, params);
        onClick?.(e);
      }}
    />
  );
}

/** Plain anchor (tel:, mailto:, wa.me, downloads) that pushes an analytics event. */
export function TrackedAnchor({
  event,
  params,
  onClick,
  ...props
}: ComponentProps<"a"> & { event: AnalyticsEvent; params?: Params }) {
  return (
    <a
      {...props}
      onClick={(e) => {
        track(event, params);
        onClick?.(e);
      }}
    />
  );
}

/** Fires once on mount — e.g. view_item on product pages, generate_lead on thank-you. */
export function TrackOnMount({ event, params }: { event: AnalyticsEvent; params?: Params }) {
  useEffect(() => {
    track(event, params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
