"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { isPageKey, pageDef } from "@/lib/cms/pages";
import type { ActionState } from "@/lib/admin/auth";
import { discardDraft, publishPage, restoreRevision, saveDraft } from "@/app/admin/_actions/cms";
import { adminButton } from "@/components/admin/ui";
import { cn, formatDateTime } from "@/lib/utils";
import { FieldInput, type MediaContext } from "./fields";
import type { PickerAsset } from "./media-picker";

type Content = Record<string, Record<string, unknown>>;
export type Revision = { id: number; created_at: string; note: string | null; author: string | null };

export function CmsEditor({
  pageKey,
  initial,
  hasDraft,
  publishedAt,
  draftSavedAt,
  revisions,
  assets: initialAssets,
  siteImages,
}: {
  pageKey: string;
  initial: Content;
  hasDraft: boolean;
  publishedAt: string | null;
  draftSavedAt: string | null;
  revisions: Revision[];
  assets: PickerAsset[];
  siteImages: string[];
}) {
  const router = useRouter();
  const def = isPageKey(pageKey) ? pageDef(pageKey) : null;
  const [content, setContent] = useState<Content>(initial);
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const [status, setStatus] = useState<ActionState | null>(null);
  const [pending, startTransition] = useTransition();
  const [assets, setAssets] = useState(initialAssets);
  const json = JSON.stringify(content);
  const dirty = json !== saved;

  // A fresh server render (after save, publish or restore) replaces the editor's content.
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setContent(initial);
    setSaved(JSON.stringify(initial));
  }

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const run = useCallback(
    (fn: () => Promise<ActionState>, after?: (s: ActionState) => void) =>
      startTransition(async () => {
        const result = await fn();
        setStatus(result);
        if (result.ok) {
          after?.(result);
          router.refresh();
        }
      }),
    [router],
  );

  const save = useCallback(
    (then?: () => void) =>
      run(
        () => saveDraft(pageKey, json),
        () => {
          setSaved(json);
          then?.();
        },
      ),
    [json, pageKey, run],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  const media: MediaContext = useMemo(
    () => ({ assets, siteImages, onUploaded: (a) => setAssets((list) => [a, ...list.filter((x) => x.id !== a.id)]) }),
    [assets, siteImages],
  );

  if (!def) return null;

  const stateLabel = dirty ? "Unsaved changes" : hasDraft ? `Draft saved ${draftSavedAt ? formatDateTime(draftSavedAt) : ""} — not yet live` : publishedAt ? `Live · published ${formatDateTime(publishedAt)}` : "Showing the default content";
  const preview = () => {
    const open = () => window.open(`/admin/preview?key=${encodeURIComponent(pageKey)}`, "_blank", "noopener");
    if (dirty) save(open);
    else open();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
      {/* Section navigation */}
      <nav aria-label="Sections" className="hidden lg:block">
        <ul className="sticky top-6 grid gap-0.5 text-sm">
          {def.sections.map((s) => (
            <li key={s.key}>
              <a href={`#section-${s.key}`} className="block rounded-md px-3 py-1.5 text-ink-soft hover:bg-ink/5 hover:text-ink">
                {s.label}
              </a>
            </li>
          ))}
          <li className="mt-3 border-t border-line pt-3">
            <a href="#revisions" className="block rounded-md px-3 py-1.5 text-muted hover:bg-ink/5 hover:text-ink">
              Revision history
            </a>
          </li>
        </ul>
      </nav>

      <div className="grid min-w-0 gap-6">
        {/* Action bar */}
        <div className="sticky top-0 z-30 -mx-1 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface/95 px-4 py-3 shadow-sm backdrop-blur lg:top-2">
          <span className={cn("mr-auto flex items-center gap-2 text-sm", dirty ? "text-warn" : "text-muted")}>
            <span className={cn("h-2 w-2 rounded-full", dirty ? "bg-warn" : hasDraft ? "bg-bronze" : "bg-accent")} aria-hidden />
            {stateLabel}
          </span>
          {status && (status.message || status.error) && (
            <span role="status" className={cn("text-sm", status.ok ? "text-accent" : "text-danger")}>
              {status.ok ? `✓ ${status.message}` : status.error}
            </span>
          )}
          {def.path && (
            <button type="button" className={adminButton("secondary")} disabled={pending} onClick={preview}>
              Preview
            </button>
          )}
          <button type="button" className={adminButton("secondary")} disabled={pending || !dirty} onClick={() => save()}>
            Save draft
          </button>
          <button
            type="button"
            className={adminButton("primary")}
            disabled={pending}
            onClick={() => {
              if (!window.confirm("Publish these changes to the live website?")) return;
              run(() => publishPage(pageKey, json), () => setSaved(json));
            }}
          >
            {pending ? "Working…" : "Publish"}
          </button>
          {hasDraft && (
            <button
              type="button"
              className={adminButton("ghost", "text-danger")}
              disabled={pending}
              onClick={() => {
                if (window.confirm("Discard the draft and return to the live version?")) run(() => discardDraft(pageKey));
              }}
            >
              Discard draft
            </button>
          )}
        </div>

        {def.description && <p className="text-sm text-muted">{def.description}</p>}

        {def.sections.map((s) => (
          <section key={s.key} id={`section-${s.key}`} className="scroll-mt-24 rounded-xl border border-line bg-surface">
            <header className="border-b border-line px-5 py-4">
              <h2 className="font-semibold tracking-[-0.01em]">{s.label}</h2>
              {s.description && <p className="mt-0.5 text-sm text-muted">{s.description}</p>}
            </header>
            <div className="grid gap-5 p-5">
              {s.fields.map((f) => (
                <FieldInput
                  key={f.key}
                  field={f}
                  value={content[s.key]?.[f.key]}
                  media={media}
                  onChange={(v) => setContent((c) => ({ ...c, [s.key]: { ...c[s.key], [f.key]: v } }))}
                />
              ))}
            </div>
          </section>
        ))}

        <section id="revisions" className="scroll-mt-24 rounded-xl border border-line bg-surface">
          <header className="border-b border-line px-5 py-4">
            <h2 className="font-semibold tracking-[-0.01em]">Revision history</h2>
            <p className="mt-0.5 text-sm text-muted">Every publish is kept. Restoring loads that version into the draft for you to review and publish.</p>
          </header>
          {revisions.length ? (
            <ul className="divide-y divide-line text-sm">
              {revisions.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <span className="font-medium">{formatDateTime(r.created_at)}</span>
                  <span className="text-muted">{[r.note, r.author].filter(Boolean).join(" · ")}</span>
                  <button
                    type="button"
                    className={adminButton("ghost", "ml-auto !h-8 text-accent")}
                    disabled={pending}
                    onClick={() => {
                      if (dirty && !window.confirm("You have unsaved changes. Restore anyway?")) return;
                      run(() => restoreRevision(pageKey, r.id));
                    }}
                  >
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-sm text-muted">Nothing published yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
