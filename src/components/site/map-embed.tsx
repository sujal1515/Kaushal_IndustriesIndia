"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";
import { MapPin } from "@/components/ui/icons";

/** Click-to-load map: no third-party map scripts until the visitor asks (blueprint §3.4). */
export function MapEmbed({ src, link, label }: { src: string; link: string; label: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-stone">
      {loaded ? (
        <iframe
          src={src}
          title={`Map showing ${label}`}
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center p-6 text-center">
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(var(--color-line-strong)_1px,transparent_1px),linear-gradient(90deg,var(--color-line-strong)_1px,transparent_1px)] [background-size:40px_40px]"
          />
          <div className="relative">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-[0.25rem] bg-accent text-white">
              <MapPin size={22} />
            </span>
            <p className="mt-4 text-[1.125rem] font-medium">{label}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setLoaded(true);
                  track("contact_click", { method: "map", location: "contact_page" });
                }}
                className="rounded-[0.25rem] bg-ink px-5 py-3 text-[1rem] font-semibold text-white transition-colors duration-[450ms] hover:bg-accent-strong"
              >
                Load interactive map
              </button>
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("contact_click", { method: "directions", location: "contact_page" })}
                className="rounded-[0.25rem] border border-line-strong px-5 py-3 text-[1rem] font-semibold transition-colors duration-[450ms] hover:border-ink"
              >
                Open in Google Maps
              </a>
            </div>
            <p className="mt-4 font-mono text-[0.8rem] uppercase text-muted">Loading the map shares data with Google.</p>
          </div>
        </div>
      )}
    </div>
  );
}
