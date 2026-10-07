import Image from "next/image";
import { mediaUrl, STORAGE_BUCKETS } from "@/lib/env";
import type { Resource } from "@/lib/types";
import { TrackedAnchor } from "./tracked";

/**
 * Certificate / award evidence in hairline grid items. Image files show a thumbnail that zooms
 * on hover with the pointer label; PDFs show a document tile.
 */
export function CertificateGrid({ items }: { items: Resource[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-4" data-rise>
      {items.map((r) => {
        const url = mediaUrl(r.storage_path, STORAGE_BUCKETS.documents);
        const isImage = (r.mime_type ?? "").startsWith("image/") || /\.(png|jpe?g|webp|avif)$/i.test(r.storage_path);
        return (
          <li key={r.id} className="grid-item">
            <TrackedAnchor
              href={url ?? "#"}
              target="_blank"
              rel="noopener"
              event="file_download"
              params={{ file_name: r.title, resource_type: r.type }}
              className="group block"
            >
              <div className="media-frame relative aspect-[4/5]">
                {isImage && url ? (
                  <Image
                    src={url}
                    alt={`${r.title}${r.issuer ? ` — ${r.issuer}` : ""}`}
                    fill
                    sizes="(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 45vw"
                    className="media-zoom object-contain p-[8%]"
                  />
                ) : (
                  <div className="grid h-full place-items-center font-mono text-[0.875rem] uppercase text-muted">PDF</div>
                )}
              </div>
              <p className="mt-5 text-[1.125rem] font-medium leading-snug tracking-[-0.01em]">
                <span className="u-link">{r.title}</span>
              </p>
              {r.issuer && <p className="mt-1.5 font-mono text-[0.8rem] font-medium uppercase text-muted">{r.issuer}</p>}
            </TrackedAnchor>
          </li>
        );
      })}
    </ul>
  );
}
