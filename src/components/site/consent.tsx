"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { publicEnv } from "@/lib/env";
import { buttonClass } from "@/components/ui/button";

const KEY = "kia-consent";
const OPEN_EVENT = "kia:open-consent";

type Choice = "granted" | "denied";

function readChoice(): Choice | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

function applyChoice(choice: Choice) {
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    /* storage unavailable — choice applies to this page view only */
  }
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  w.gtag?.("consent", "update", { analytics_storage: choice });
}

/**
 * Consent Mode v2 banner (blueprint §9.4 — recommendation pending client/legal confirmation).
 * Only rendered when a GTM container is configured; ad storage is never requested.
 */
export function ConsentBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!publicEnv.gtmId) return;
    const t = setTimeout(() => setOpen(readChoice() === null), 0);
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, reopen);
    return () => {
      clearTimeout(t);
      window.removeEventListener(OPEN_EVENT, reopen);
    };
  }, []);

  if (!publicEnv.gtmId || !open) return null;

  const decide = (choice: Choice) => {
    applyChoice(choice);
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie preferences"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-xl animate-rise rounded-[0.25rem] border border-line-strong bg-paper p-6 sm:inset-x-6 sm:bottom-6"
    >
      <p className="text-[1rem] leading-relaxed text-ink-soft">
        We use analytics cookies to understand which products buyers look at, so we can improve this site. No
        advertising cookies. See our{" "}
        <Link href="/privacy-policy" className="underline underline-offset-2">
          privacy policy
        </Link>
        .
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={() => decide("granted")} className={buttonClass("dark", "sm")}>
          Allow analytics
        </button>
        <button type="button" onClick={() => decide("denied")} className={buttonClass("secondary", "sm")}>
          Decline
        </button>
      </div>
    </div>
  );
}

export function CookieSettingsButton({ className }: { className?: string }) {
  if (!publicEnv.gtmId) return null;
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>
      Cookie settings
    </button>
  );
}

/** Inline head script: Consent Mode defaults, then GTM. Runs before any tag fires. */
export function gtmHeadScript(gtmId: string) {
  return `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});
try{if(localStorage.getItem('${KEY}')==='granted'){gtag('consent','update',{analytics_storage:'granted'});}}catch(e){}
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`;
}
