"use client";

import { registerMedia, type MediaAsset } from "@/app/admin/_actions/media";
import { uploadFile } from "./uploads";

/** Pixel size of an image file (null for anything the browser can't decode). */
function imageSize(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) return resolve(null);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/** Upload an image to the media library (site-media bucket) and record it. */
export async function uploadToLibrary(file: File, altText = ""): Promise<MediaAsset> {
  const [path, size] = await Promise.all([uploadFile("site-media", "library", file), imageSize(file)]);
  const result = await registerMedia({
    path,
    file_name: file.name.slice(0, 200),
    alt_text: altText,
    mime_type: file.type || null,
    file_size: file.size,
    width: size?.width ?? null,
    height: size?.height ?? null,
  });
  if (!result.asset) throw new Error(result.error ?? "Upload failed.");
  return result.asset;
}
