"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { buttonClass } from "@/components/ui/button";
import { WhatsApp } from "@/components/ui/icons";
import { TrackedAnchor, TrackedLink } from "@/components/site/tracked";

/**
 * Phone-only action bar on product pages: once the hero's buttons have scrolled away, the
 * quote request and WhatsApp stay one tap away at the bottom of the screen.
 */
export function ProductActionBar({
  quoteHref,
  quoteLabel,
  whatsappHref,
  product,
  category,
}: {
  quoteHref: string;
  quoteLabel: string;
  whatsappHref: string;
  product: string;
  category: string;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const footer = document.querySelector("footer");
      const nearEnd = footer ? footer.getBoundingClientRect().top < window.innerHeight : false;
      setShow(window.scrollY > window.innerHeight * 0.9 && !nearEnd);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={cn(
        "no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur-md transition-transform duration-500 ease-[var(--ease-expo)] md:hidden",
        show ? "translate-y-0" : "translate-y-full",
      )}
      aria-hidden={!show}
    >
      <div className="flex gap-3">
        <TrackedLink
          href={quoteHref}
          event="quote_start"
          params={{ location: "product_bar", product, category }}
          className={buttonClass("primary", "md", "flex-1")}
          tabIndex={show ? 0 : -1}
        >
          {quoteLabel}
        </TrackedLink>
        <TrackedAnchor
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          event="contact_click"
          params={{ method: "whatsapp", location: "product_bar", product }}
          className={buttonClass("secondary", "md", "px-4")}
          aria-label="WhatsApp"
          tabIndex={show ? 0 : -1}
        >
          <WhatsApp size={20} />
        </TrackedAnchor>
      </div>
    </div>
  );
}
