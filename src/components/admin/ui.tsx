import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminHeader({
  title,
  description,
  actions,
  back,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        {back && (
          <Link href={back.href} className="mb-3 inline-block text-sm text-muted hover:text-ink">
            ← {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-semibold tracking-[-0.025em]">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, description, children, className, actions, id }: {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-24 rounded-xl border border-line bg-surface", className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            {title && <h2 className="font-semibold tracking-[-0.01em]">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
  htmlFor,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export const inputClass = "field !py-2 !text-[0.92rem]";

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={cn(inputClass, props.className)} />;
}

export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea rows={4} {...props} className={cn(inputClass, "resize-y font-[inherit]", props.className)} />;
}

export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={cn(inputClass, props.className)} />;
}

export function Checkbox({ label, ...props }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <input type="checkbox" {...props} className="h-4 w-4 accent-[var(--color-accent)]" />
      {label}
    </label>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" | "warn" | "danger" | "dark" }) {
  const tones = {
    neutral: "bg-ink/[0.06] text-ink-soft",
    accent: "bg-accent-soft text-accent-strong",
    warn: "bg-warn-soft text-warn",
    danger: "bg-danger-soft text-danger",
    dark: "bg-ink text-white",
  };
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

export const statusTone = (s: string) =>
  (({ published: "accent", coming_soon: "warn", draft: "neutral", discontinued: "danger" }) as const)[s as "published"] ?? "neutral";

export const enquiryTone = (s: string) =>
  (({ new: "dark", contacted: "warn", quoted: "accent", won: "accent", lost: "neutral", spam: "danger" }) as const)[s as "new"] ?? "neutral";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[640px] border-collapse text-sm [&_td]:border-t [&_td]:border-line [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted">
        {children}
      </table>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-line-strong p-10 text-center text-sm text-muted">{children}</div>;
}

export function adminButton(variant: "primary" | "secondary" | "danger" | "ghost" = "primary", extra?: string) {
  return cn(
    "inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 text-sm font-medium transition-colors disabled:opacity-50",
    variant === "primary" && "bg-ink text-white hover:bg-ink-soft",
    variant === "secondary" && "border border-line-strong bg-surface hover:border-ink/40",
    variant === "danger" && "border border-danger/30 bg-surface text-danger hover:bg-danger-soft",
    variant === "ghost" && "text-ink-soft hover:bg-ink/5",
    extra,
  );
}

/** "Label: value" lines ↔ array helpers for compact admin editing. */
export function toLines(items: { label: string; value: string }[]) {
  return items.map((i) => `${i.label}: ${i.value}`).join("\n");
}
