"use client";

import Link from "next/link";
import { useEffect } from "react";
import { buttonClass } from "@/components/ui/button";
import { PageHero } from "@/components/ui/primitives";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageHero
      eyebrow="Error"
      title="Something went wrong on our side."
      lead="Please try again. If the problem continues, contact us by phone or email."
    >
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={reset} className={buttonClass("inverse", "lg")}>
            Try again
          </button>
          <Link href="/contact" className={buttonClass("secondary", "lg", "border-white/40 text-white hover:border-white")}>
            Contact us
          </Link>
        </div>
        {error.digest && <p className="font-mono text-[0.875rem] text-white/75">Ref: {error.digest}</p>}
      </div>
    </PageHero>
  );
}
