"use client";

import { useId, useState } from "react";
import type { Field, ListField } from "@/lib/cms/schema";
import { mediaUrl } from "@/lib/env";
import { Markdown } from "@/components/ui/markdown";
import { adminButton, inputClass } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import { MediaPicker, type PickerAsset } from "./media-picker";

type Obj = Record<string, unknown>;
export type MediaContext = { assets: PickerAsset[]; siteImages: string[]; onUploaded: (a: PickerAsset) => void };

const asString = (v: unknown) => (typeof v === "string" ? v : "");
const asArray = (v: unknown) => (Array.isArray(v) ? v : []);

/** An empty value for a field, used when adding list items. */
export function emptyValue(f: Field): unknown {
  switch (f.type) {
    case "link":
      return { label: "", href: "" };
    case "strings":
    case "list":
      return [];
    case "select":
      return f.options[0]?.value ?? "";
    default:
      return "";
  }
}

const move = <T,>(arr: T[], from: number, to: number) => {
  const next = [...arr];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
};

function Label({ field, htmlFor, extra }: { field: Field; htmlFor?: string; extra?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {field.label}
      </label>
      {extra}
    </div>
  );
}

const Hint = ({ text }: { text?: string }) => (text ? <p className="text-xs text-muted">{text}</p> : null);

function IconButton({ label, onClick, children, disabled }: { label: string; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-ink/5 hover:text-ink disabled:opacity-30">
      {children}
    </button>
  );
}

/** Renders the right input for a field. */
export function FieldInput({ field, value, onChange, media }: { field: Field; value: unknown; onChange: (v: unknown) => void; media: MediaContext }) {
  const id = useId();
  switch (field.type) {
    case "text":
      return (
        <div className="grid gap-1.5">
          <Label field={field} htmlFor={id} />
          <input id={id} className={inputClass} value={asString(value)} maxLength={field.max} onChange={(e) => onChange(e.target.value)} />
          <Hint text={field.hint} />
        </div>
      );
    case "textarea":
      return (
        <div className="grid gap-1.5">
          <Label field={field} htmlFor={id} />
          <textarea id={id} rows={field.rows ?? 3} className={cn(inputClass, "resize-y font-[inherit]")} value={asString(value)} onChange={(e) => onChange(e.target.value)} />
          <Hint text={field.hint} />
        </div>
      );
    case "markdown":
      return <MarkdownInput id={id} field={field} value={asString(value)} onChange={onChange} />;
    case "select":
      return (
        <div className="grid gap-1.5">
          <Label field={field} htmlFor={id} />
          <select id={id} className={inputClass} value={asString(value)} onChange={(e) => onChange(e.target.value)}>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Hint text={field.hint} />
        </div>
      );
    case "link": {
      const v = (value && typeof value === "object" ? value : {}) as Obj;
      return (
        <fieldset className="grid gap-1.5">
          <legend className="mb-1.5 text-sm font-medium">{field.label}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <input aria-label={`${field.label} — text`} placeholder="Link text" className={inputClass} value={asString(v.label)} onChange={(e) => onChange({ ...v, label: e.target.value })} />
            <input aria-label={`${field.label} — address`} placeholder="/page, https://…, mailto:" className={inputClass} value={asString(v.href)} onChange={(e) => onChange({ ...v, href: e.target.value })} />
          </div>
          <Hint text={field.hint} />
        </fieldset>
      );
    }
    case "image":
      return <ImageInput id={id} field={field} value={asString(value)} onChange={onChange} media={media} />;
    case "strings":
      return <StringsInput field={field} value={asArray(value).map(asString)} onChange={onChange} />;
    case "list":
      return <ListInput field={field} value={asArray(value) as Obj[]} onChange={onChange} media={media} />;
  }
}

function MarkdownInput({ id, field, value, onChange }: { id: string; field: Field & { rows?: number }; value: string; onChange: (v: unknown) => void }) {
  const [preview, setPreview] = useState(false);
  return (
    <div className="grid gap-1.5">
      <Label
        field={field}
        htmlFor={id}
        extra={
          <div className="flex rounded-md border border-line text-xs">
            {["Write", "Preview"].map((m) => (
              <button key={m} type="button" onClick={() => setPreview(m === "Preview")} className={cn("px-2.5 py-1", (m === "Preview") === preview ? "bg-ink text-white" : "text-muted hover:text-ink")}>
                {m}
              </button>
            ))}
          </div>
        }
      />
      {preview ? (
        <div className="min-h-40 rounded-lg border border-line bg-paper p-4 text-sm leading-relaxed [&_a]:underline [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:font-semibold [&_li]:mt-1 [&_p+p]:mt-3 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
          <Markdown text={value} />
        </div>
      ) : (
        <textarea id={id} rows={field.rows ?? 14} className={cn(inputClass, "resize-y font-mono !text-[0.85rem] leading-relaxed")} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      <Hint text={field.hint} />
    </div>
  );
}

function ImageInput({ id, field, value, onChange, media }: { id: string; field: Field; value: string; onChange: (v: unknown) => void; media: MediaContext }) {
  const [open, setOpen] = useState(false);
  const src = mediaUrl(value, "site-media");
  return (
    <div className="grid gap-1.5">
      <Label field={field} htmlFor={id} />
      <div className="flex gap-3">
        <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-paper">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs text-muted">None</span>
          )}
        </div>
        <div className="grid min-w-0 flex-1 content-start gap-2">
          <input id={id} className={inputClass} value={value} placeholder="/images/… or choose from the library" onChange={(e) => onChange(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className={adminButton("secondary", "!h-8")} onClick={() => setOpen(true)}>
              Choose or upload…
            </button>
            {value && (
              <button type="button" className={adminButton("ghost", "!h-8")} onClick={() => onChange("")}>
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
      <Hint text={field.hint} />
      {open && (
        <MediaPicker
          assets={media.assets}
          siteImages={media.siteImages}
          onUploaded={media.onUploaded}
          onClose={() => setOpen(false)}
          onPick={(path) => {
            onChange(path);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function StringsInput({ field, value, onChange }: { field: Field & { itemLabel?: string }; value: string[]; onChange: (v: unknown) => void }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1.5 text-sm font-medium">{field.label}</legend>
      {value.map((v, i) => (
        <div key={i} className="flex items-center gap-1">
          <input aria-label={`${field.itemLabel ?? "Item"} ${i + 1}`} className={cn(inputClass, "flex-1")} value={v} onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))} />
          <IconButton label="Move up" disabled={i === 0} onClick={() => onChange(move(value, i, i - 1))}>
            ↑
          </IconButton>
          <IconButton label="Move down" disabled={i === value.length - 1} onClick={() => onChange(move(value, i, i + 1))}>
            ↓
          </IconButton>
          <IconButton label="Remove" onClick={() => onChange(value.filter((_, j) => j !== i))}>
            ✕
          </IconButton>
        </div>
      ))}
      <div>
        <button type="button" className={adminButton("ghost", "!h-8 !px-2 text-accent")} onClick={() => onChange([...value, ""])}>
          + Add {(field.itemLabel ?? "item").toLowerCase()}
        </button>
      </div>
      <Hint text={field.hint} />
    </fieldset>
  );
}

function ListInput({ field, value, onChange, media }: { field: ListField; value: Obj[]; onChange: (v: unknown) => void; media: MediaContext }) {
  const [openIdx, setOpenIdx] = useState<number | null>(value.length <= 3 ? -1 : null); // -1: all open
  const isOpen = (i: number) => openIdx === -1 || openIdx === i;
  const blank = () => Object.fromEntries(field.fields.map((f) => [f.key, emptyValue(f)]));
  const atMax = field.max !== undefined && value.length >= field.max;

  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1.5 text-sm font-medium">{field.label}</legend>
      <Hint text={field.hint} />
      {value.map((item, i) => {
        const title = asString(item[field.titleKey ?? ""]) || `${field.itemLabel} ${i + 1}`;
        return (
          <div key={i} className="rounded-lg border border-line bg-paper">
            <div className="flex items-center gap-1 px-2 py-1.5">
              <button type="button" onClick={() => setOpenIdx(isOpen(i) && openIdx !== -1 ? null : i)} className="flex min-w-0 flex-1 items-center gap-2 px-1 text-left text-sm" aria-expanded={isOpen(i)}>
                <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
                <span className="truncate font-medium">{title}</span>
              </button>
              <IconButton label="Move up" disabled={i === 0} onClick={() => onChange(move(value, i, i - 1))}>
                ↑
              </IconButton>
              <IconButton label="Move down" disabled={i === value.length - 1} onClick={() => onChange(move(value, i, i + 1))}>
                ↓
              </IconButton>
              <IconButton label={`Duplicate ${field.itemLabel.toLowerCase()}`} disabled={atMax} onClick={() => onChange([...value.slice(0, i + 1), structuredClone(item), ...value.slice(i + 1)])}>
                ⧉
              </IconButton>
              <IconButton
                label={`Remove ${field.itemLabel.toLowerCase()}`}
                onClick={() => {
                  if (window.confirm(`Remove “${title}”?`)) onChange(value.filter((_, j) => j !== i));
                }}
              >
                ✕
              </IconButton>
            </div>
            {isOpen(i) && (
              <div className="grid gap-4 border-t border-line bg-surface p-4">
                {field.fields.map((f) => (
                  <FieldInput key={f.key} field={f} value={item[f.key]} media={media} onChange={(v) => onChange(value.map((x, j) => (j === i ? { ...x, [f.key]: v } : x)))} />
                ))}
              </div>
            )}
          </div>
        );
      })}
      <div>
        <button
          type="button"
          disabled={atMax}
          className={adminButton("ghost", "!h-8 !px-2 text-accent")}
          onClick={() => {
            onChange([...value, blank()]);
            setOpenIdx(value.length);
          }}
        >
          + Add {field.itemLabel.toLowerCase()}
        </button>
        {atMax && <span className="ml-2 text-xs text-muted">Maximum {field.max}</span>}
      </div>
    </fieldset>
  );
}
