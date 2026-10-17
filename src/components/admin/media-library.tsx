"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mediaUrl } from "@/lib/env";
import { formatBytes, formatDateTime } from "@/lib/utils";
import { deleteMedia, updateMediaAlt, type MediaAsset } from "@/app/admin/_actions/media";
import { uploadToLibrary } from "./media-upload";
import { ActionForm } from "./action-form";
import { adminButton, inputClass } from "./ui";
import { cn } from "@/lib/utils";

/** Media library: upload images, describe them (alt text), copy their path, delete them. */
export function MediaLibrary({ assets }: { assets: MediaAsset[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [dragging, setDragging] = useState(false);

  const term = q.trim().toLowerCase();
  const items = assets.filter((a) => !term || `${a.file_name} ${a.alt_text}`.toLowerCase().includes(term));
  const current = assets.find((a) => a.id === selected) ?? null;

  async function upload(files: FileList | File[] | null) {
    const list = Array.from(files ?? []);
    if (!list.length) return;
    setError(null);
    try {
      for (const [i, f] of list.entries()) {
        setBusy(`Uploading ${i + 1} of ${list.length}…`);
        await uploadToLibrary(f);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="grid content-start gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <input type="search" placeholder="Search by name or description…" aria-label="Search media" className={cn(inputClass, "max-w-xs")} value={q} onChange={(e) => setQ(e.target.value)} />
          <span className="text-sm text-muted">{items.length} file{items.length === 1 ? "" : "s"}</span>
          <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={(e) => upload(e.target.files)} />
          <button type="button" className={adminButton("primary", "ml-auto")} disabled={!!busy} onClick={() => fileRef.current?.click()}>
            {busy ?? "Upload images"}
          </button>
        </div>
        {error && <p className="rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p>}

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            upload(e.dataTransfer.files);
          }}
          className={cn("rounded-xl border-2 border-dashed p-4 transition-colors", dragging ? "border-accent bg-accent-soft/40" : "border-transparent")}
        >
          {items.length ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {items.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => setSelected(a.id)} className={cn("group block w-full rounded-lg border bg-surface p-2 text-left transition-colors", selected === a.id ? "border-ink" : "border-line hover:border-ink/40")}>
                    <span className="grid aspect-square place-items-center overflow-hidden rounded-md bg-paper">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={mediaUrl(a.path, "site-media") ?? ""} alt={a.alt_text} loading="lazy" className="h-full w-full object-contain" />
                    </span>
                    <span className="mt-2 block truncate text-xs font-medium">{a.file_name}</span>
                    <span className={cn("block truncate text-xs", a.alt_text ? "text-muted" : "text-warn")}>{a.alt_text || "No description"}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-16 text-center text-sm text-muted">{assets.length ? "Nothing matches your search." : "No images yet. Upload, or drop files here."}</p>
          )}
        </div>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        {current ? (
          <div className="grid gap-4 rounded-xl border border-line bg-surface p-4">
            <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-lg bg-paper">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(current.path, "site-media") ?? ""} alt={current.alt_text} className="h-full w-full object-contain" />
            </div>
            <dl className="grid gap-1 text-xs text-muted">
              <div className="truncate font-medium text-ink">{current.file_name}</div>
              <div>
                {[current.width && current.height ? `${current.width} × ${current.height}px` : null, formatBytes(current.file_size), current.mime_type].filter(Boolean).join(" · ")}
              </div>
              <div>Uploaded {formatDateTime(current.created_at)}</div>
            </dl>
            <div className="flex gap-2">
              <input readOnly value={current.path} aria-label="Path" className={cn(inputClass, "flex-1 font-mono !text-xs")} />
              <button
                type="button"
                className={adminButton("secondary")}
                onClick={async () => {
                  await navigator.clipboard.writeText(current.path);
                  setCopied(current.id);
                  setTimeout(() => setCopied(null), 1500);
                }}
              >
                {copied === current.id ? "Copied" : "Copy"}
              </button>
            </div>
            <ActionForm key={current.id} action={updateMediaAlt.bind(null, current.id)} submitLabel="Save description" onSuccess={() => router.refresh()}>
              <label className="grid gap-1.5 text-sm font-medium">
                Description (alt text)
                <textarea name="alt_text" rows={3} defaultValue={current.alt_text} className={cn(inputClass, "resize-y font-[inherit]")} placeholder="What the image shows, for screen readers and search engines" />
              </label>
            </ActionForm>
            <button
              type="button"
              disabled={pending}
              className={adminButton("danger")}
              onClick={() => {
                if (!window.confirm("Delete this file? Pages using it will show no image.")) return;
                startTransition(async () => {
                  const r = await deleteMedia(current.id);
                  if (!r.ok) setError(r.error ?? "Could not delete.");
                  else {
                    setSelected(null);
                    router.refresh();
                  }
                });
              }}
            >
              Delete file
            </button>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-line-strong p-6 text-sm text-muted">Select an image to see its details, edit its description, copy its path or delete it.</p>
        )}
      </aside>
    </div>
  );
}
