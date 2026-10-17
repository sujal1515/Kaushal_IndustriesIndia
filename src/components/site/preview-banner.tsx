/** Shown to content staff while they preview unpublished drafts (Next.js draft mode). */
export function PreviewBanner() {
  return (
    <div className="no-print fixed bottom-4 left-1/2 z-[140] flex -translate-x-1/2 items-center gap-4 rounded-full bg-ink px-5 py-2.5 text-sm text-white shadow-lg">
      <span className="flex items-center gap-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-bronze" aria-hidden />
        Previewing drafts
      </span>
      <a href="/admin/preview/exit" className="font-semibold underline underline-offset-4">
        Exit preview
      </a>
    </div>
  );
}
