"use client";

import { useEffect, useRef, useState } from "react";
import { mediaUrl } from "@/lib/env";
import { adminButton, inputClass } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import { uploadToLibrary } from "@/components/admin/media-upload";

export type PickerAsset = { id: string; path: string; file_name: string; alt_text: string };

/** Choose an image from the media library or the site's built-in images, or upload a new one. */
export function MediaPicker({
  assets,
  siteImages,
  onPick,
  onClose,
  onUploaded,
}: {
  assets: PickerAsset[];
  siteImages: string[];
  onPick: (path: string) => void;
  onClose: () => void;
  onUploaded: (a: PickerAsset) => void;
}) {
  const [tab, setTab] = useState<"library" | "site">(assets.length ? "library" : "site");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    dialogRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const term = q.trim().toLowerCase();
  const items =
    tab === "library"
      ? assets.filter((a) => !term || `${a.file_name} ${a.alt_text}`.toLowerCase().includes(term)).map((a) => ({ key: a.id, path: a.path, label: a.alt_text || a.file_name }))
      : siteImages.filter((p) => !term || p.toLowerCase().includes(term)).map((p) => ({ key: p, path: p, label: p.split("/").pop() ?? p }));

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      let last: PickerAsset | null = null;
      for (const f of Array.from(files)) {
        last = await uploadToLibrary(f);
        onUploaded(last);
      }
      setTab("library");
      if (last && files.length === 1) onPick(last.path);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-ink/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Choose an image" className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-surface shadow-2xl outline-none">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
          <h2 className="mr-auto font-semibold">Choose an image</h2>
          <div className="flex rounded-lg border border-line text-sm">
            {(
              [
                ["library", `Media library (${assets.length})`],
                ["site", `Site images (${siteImages.length})`],
              ] as const
            ).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setTab(k)} className={cn("px-3 py-1.5", tab === k ? "bg-ink text-white" : "text-muted hover:text-ink")}>
                {label}
              </button>
            ))}
          </div>
          <input type="search" placeholder="Search…" aria-label="Search images" className={cn(inputClass, "!w-44")} value={q} onChange={(e) => setQ(e.target.value)} />
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden onChange={(e) => upload(e.target.files)} />
          <button type="button" className={adminButton("primary")} disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? "Uploading…" : "Upload"}
          </button>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-ink/5">
            ✕
          </button>
        </div>
        {error && <p className="bg-danger-soft px-5 py-2 text-sm text-danger">{error}</p>}
        <div className="overflow-y-auto p-5">
          {items.length ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {items.map((it) => (
                <li key={it.key}>
                  <button type="button" onClick={() => onPick(it.path)} className="group block w-full text-left">
                    <span className="grid aspect-square place-items-center overflow-hidden rounded-lg border border-line bg-paper transition-colors group-hover:border-ink/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={mediaUrl(it.path, "site-media") ?? ""} alt="" loading="lazy" className="h-full w-full object-contain p-2" />
                    </span>
                    <span className="mt-1.5 block truncate text-xs text-muted group-hover:text-ink">{it.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-12 text-center text-sm text-muted">{tab === "library" ? "No uploads yet — use Upload to add images." : "No images match."}</p>
          )}
        </div>
      </div>
    </div>
  );
}
