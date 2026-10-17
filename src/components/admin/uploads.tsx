"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/browser";
import { mediaUrl } from "@/lib/env";
import { slugify } from "@/lib/utils";
import type { ActionState } from "@/lib/admin/auth";
import { adminButton, inputClass } from "./ui";

const LIMITS: Record<string, { types: string[]; maxMb: number }> = {
  "product-images": { types: ["image/jpeg", "image/png", "image/webp", "image/avif"], maxMb: 10 },
  documents: { types: ["application/pdf", "image/jpeg", "image/png", "image/webp"], maxMb: 50 },
  "site-media": { types: ["image/jpeg", "image/png", "image/webp", "image/avif"], maxMb: 10 },
};

/** Uploads straight from the browser to Supabase Storage (RLS-checked), returning the object path. */
export async function uploadFile(bucket: string, folder: string, file: File) {
  const limit = LIMITS[bucket];
  if (limit && !limit.types.includes(file.type)) throw new Error(`File type ${file.type || "unknown"} is not allowed here.`);
  if (limit && file.size > limit.maxMb * 1024 * 1024) throw new Error(`File is larger than ${limit.maxMb} MB.`);
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const base = slugify(file.name.replace(/\.[^.]+$/, "")) || "file";
  const path = `${folder}/${Date.now()}-${base}.${ext}`;
  const { error } = await getBrowserClient().storage.from(bucket).upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
  if (error) throw new Error(error.message);
  return path;
}

/**
 * Form field holding a storage path (or local /images path), with an upload button that fills it.
 * Also fills sibling hidden inputs for file size and MIME type when provided.
 */
export function UploadField({
  name,
  bucket,
  folder,
  defaultValue,
  accept,
  withMeta = false,
  label = "Upload file",
}: {
  name: string;
  bucket: string;
  folder: string;
  defaultValue?: string | null;
  accept?: string;
  withMeta?: boolean;
  label?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [size, setSize] = useState("");
  const [mime, setMime] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const preview = mediaUrl(value, bucket);
  const isImage = /\.(png|jpe?g|webp|avif)$/i.test(value);

  return (
    <div className="grid gap-2">
      <div className="flex gap-2">
        <input name={name} value={value} onChange={(e) => setValue(e.target.value)} className={inputClass} placeholder="Upload a file or paste a path" />
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className={adminButton("secondary")}>
          {busy ? "Uploading…" : label}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setBusy(true);
            setError(null);
            try {
              const path = await uploadFile(bucket, folder, f);
              setValue(path);
              setSize(String(f.size));
              setMime(f.type);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Upload failed");
            } finally {
              setBusy(false);
              e.target.value = "";
            }
          }}
        />
      </div>
      {withMeta && (
        <>
          <input type="hidden" name="file_size" value={size} />
          <input type="hidden" name="mime_type" value={mime} />
        </>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
      {preview && isImage && (
        // eslint-disable-next-line @next/next/no-img-element -- admin preview of arbitrary storage URLs
        <img src={preview} alt="" className="h-24 w-24 rounded-lg border border-line bg-stone object-contain p-1" />
      )}
      {preview && !isImage && (
        <a href={preview} target="_blank" rel="noopener" className="text-xs text-accent underline">
          Open current file
        </a>
      )}
    </div>
  );
}

/** Upload a product image with required alt text, then register it with the product. */
export function ProductImageUpload({
  productId,
  addImage,
}: {
  productId: string;
  addImage: (productId: string, path: string, alt: string) => Promise<ActionState>;
}) {
  const router = useRouter();
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="grid gap-2 rounded-lg border border-dashed border-line-strong p-4">
      <p className="text-sm font-medium">Add an image</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          className={inputClass}
          placeholder="Alt text — describe the image (required)"
          aria-label="Alt text for new image"
        />
        <button
          type="button"
          disabled={busy || !alt.trim()}
          onClick={() => fileRef.current?.click()}
          className={adminButton("primary")}
        >
          {busy ? "Uploading…" : "Choose image"}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          setMsg(null);
          try {
            const path = await uploadFile("product-images", productId, f);
            const res = await addImage(productId, path, alt);
            if (!res.ok) throw new Error(res.error);
            setAlt("");
            setMsg({ ok: true, text: "Image added" });
            router.refresh();
          } catch (err) {
            setMsg({ ok: false, text: err instanceof Error ? err.message : "Upload failed" });
          } finally {
            setBusy(false);
            e.target.value = "";
          }
        }}
      />
      <p className="text-xs text-muted">JPG, PNG, WebP or AVIF up to 10 MB. Use a plain white or transparent background for product cut-outs.</p>
      {msg && <p className={`text-sm ${msg.ok ? "text-accent" : "text-danger"}`}>{msg.text}</p>}
    </div>
  );
}
