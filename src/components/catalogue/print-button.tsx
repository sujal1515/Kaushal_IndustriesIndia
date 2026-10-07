"use client";

import { FileText } from "@/components/ui/icons";

/** Prints the product page as a spec sheet (print stylesheet hides navigation and CTAs). */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="group inline-flex items-center gap-2 whitespace-nowrap px-1 py-2 font-mono text-[0.875rem] font-medium uppercase text-ink transition-colors hover:text-accent"
    >
      <FileText size={16} /> <span className="u-link">Print spec sheet</span>
    </button>
  );
}
