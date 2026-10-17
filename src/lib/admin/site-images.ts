import "server-only";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "public");

/** Images shipped with the site (public/images), offered alongside the media library. */
export function listSiteImages(dir = "images"): string[] {
  try {
    return readdirSync(path.join(ROOT, dir)).flatMap((name) => {
      const rel = `${dir}/${name}`;
      if (statSync(path.join(ROOT, rel)).isDirectory()) return listSiteImages(rel);
      return /\.(png|jpe?g|webp|avif|svg)$/i.test(name) ? [`/${rel}`] : [];
    });
  } catch {
    return [];
  }
}
