"use client";

import { useState, useTransition } from "react";
import { duplicateProduct } from "@/app/admin/_actions/catalogue";
import { adminButton } from "./ui";

/** Copies a product (models, specs, images, links) as a draft and opens the copy. */
export function DuplicateProductButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        disabled={pending}
        className={adminButton("secondary")}
        onClick={() => {
          if (!window.confirm(`Make a draft copy of “${name}”, with all its models and specifications?`)) return;
          startTransition(async () => {
            const r = await duplicateProduct(id);
            if (r && !r.ok) setError(r.error ?? "Could not duplicate.");
          });
        }}
      >
        {pending ? "Copying…" : "Duplicate"}
      </button>
      {error && <span className="text-sm text-danger">{error}</span>}
    </>
  );
}
