"use client";

import { useState } from "react";
import type { ActionState } from "@/lib/admin/auth";
import { ActionForm } from "./action-form";
import { adminButton } from "./ui";

type Attr = { id: string; key: string; label: string; unit: string | null; data_type: string };
type Row = { id: string | null; model_code: string; group_label: string; status: string; values: Record<string, string> };

/**
 * Model × attribute grid editor (blueprint §6.2). Rows are models; columns come from
 * the category's attribute dictionary. Paste-friendly: plain inputs, Tab moves across.
 */
export function SpecGrid({
  attributes,
  initial,
  action,
}: {
  attributes: Attr[];
  initial: Row[];
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
}) {
  const [rows, setRows] = useState<Row[]>(initial);

  const update = (i: number, patch: Partial<Row>) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  const setValue = (i: number, key: string, v: string) =>
    setRows((r) => r.map((row, j) => (j === i ? { ...row, values: { ...row.values, [key]: v } } : row)));
  const move = (i: number, d: -1 | 1) =>
    setRows((r) => {
      const n = [...r];
      const j = i + d;
      if (j < 0 || j >= n.length) return r;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  const add = (copyFrom?: Row) =>
    setRows((r) => [
      ...r,
      copyFrom
        ? { ...copyFrom, id: null, model_code: `${copyFrom.model_code}-COPY`, values: { ...copyFrom.values } }
        : { id: null, model_code: "", group_label: r.at(-1)?.group_label ?? "", status: "published", values: {} },
    ]);

  if (!attributes.length) {
    return (
      <p className="text-sm text-muted">
        This category has no spec attributes yet. Define them under Categories &amp; specs first.
      </p>
    );
  }

  return (
    <ActionForm action={action} submitLabel="Save models & specifications" footer={
      <button type="button" onClick={() => add()} className={adminButton("secondary")}>
        + Add model
      </button>
    }>
      <input type="hidden" name="payload" value={JSON.stringify(rows)} />
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="min-w-max border-collapse text-sm">
          <thead className="bg-paper">
            <tr className="text-left text-xs text-muted">
              <th className="sticky left-0 z-10 bg-paper px-2 py-2 font-medium">Model code</th>
              <th className="px-2 py-2 font-medium">Group</th>
              <th className="px-2 py-2 font-medium">Status</th>
              {attributes.map((a) => (
                <th key={a.key} className="px-2 py-2 font-medium">
                  {a.label}
                  {a.unit && <span className="ml-1 font-mono">({a.unit})</span>}
                  {a.data_type === "number" && <span className="ml-1 text-[0.65rem]">#</span>}
                </th>
              ))}
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id ?? `new-${i}`} className="border-t border-line">
                <td className="sticky left-0 z-10 bg-surface px-1 py-1">
                  <input
                    value={r.model_code}
                    onChange={(e) => update(i, { model_code: e.target.value })}
                    aria-label={`Model code, row ${i + 1}`}
                    className="w-28 rounded border border-line px-2 py-1.5 font-mono"
                    required
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    value={r.group_label}
                    onChange={(e) => update(i, { group_label: e.target.value })}
                    aria-label={`Group, row ${i + 1}`}
                    placeholder="e.g. Single cylinder"
                    className="w-36 rounded border border-line px-2 py-1.5"
                  />
                </td>
                <td className="px-1 py-1">
                  <select value={r.status} onChange={(e) => update(i, { status: e.target.value })} aria-label={`Status, row ${i + 1}`} className="rounded border border-line px-1.5 py-1.5">
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="coming_soon">Coming soon</option>
                    <option value="discontinued">Discontinued</option>
                  </select>
                </td>
                {attributes.map((a) => (
                  <td key={a.key} className="px-1 py-1">
                    <input
                      value={r.values[a.key] ?? ""}
                      onChange={(e) => setValue(i, a.key, e.target.value)}
                      inputMode={a.data_type === "number" ? "decimal" : undefined}
                      aria-label={`${a.label}, model ${r.model_code || i + 1}`}
                      className={`rounded border border-line px-2 py-1.5 ${a.data_type === "number" ? "w-20 text-right tabular-nums" : "w-40"}`}
                    />
                  </td>
                ))}
                <td className="whitespace-nowrap px-1 py-1">
                  <button type="button" onClick={() => move(i, -1)} className="px-1.5 text-muted hover:text-ink" aria-label="Move up">↑</button>
                  <button type="button" onClick={() => move(i, 1)} className="px-1.5 text-muted hover:text-ink" aria-label="Move down">↓</button>
                  <button type="button" onClick={() => add(r)} className="px-1.5 text-muted hover:text-ink" aria-label="Duplicate row">⧉</button>
                  <button
                    type="button"
                    onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                    className="px-1.5 text-danger"
                    aria-label={`Remove model ${r.model_code}`}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={attributes.length + 4} className="px-4 py-6 text-center text-muted">
                  No models. Products without models show their highlights instead of a spec table.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted"># = numeric column (used for ranges and filters). Removing a row deletes the model when you save.</p>
    </ActionForm>
  );
}

type AttrRow = {
  id: string | null;
  key: string;
  label: string;
  unit: string;
  data_type: string;
  group_label: string;
  is_key_spec: boolean;
  is_filterable: boolean;
};

/** Spec attribute dictionary editor for a category. */
export function AttributeEditor({
  initial,
  action,
}: {
  initial: AttrRow[];
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
}) {
  const [rows, setRows] = useState<AttrRow[]>(initial);
  const update = (i: number, patch: Partial<AttrRow>) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  const move = (i: number, d: -1 | 1) =>
    setRows((r) => {
      const n = [...r];
      const j = i + d;
      if (j < 0 || j >= n.length) return r;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  return (
    <ActionForm
      action={action}
      submitLabel="Save attributes"
      confirm={undefined}
      footer={
        <button
          type="button"
          onClick={() =>
            setRows((r) => [...r, { id: null, key: "", label: "", unit: "", data_type: "number", group_label: "", is_key_spec: false, is_filterable: false }])
          }
          className={adminButton("secondary")}
        >
          + Add attribute
        </button>
      }
    >
      <input type="hidden" name="payload" value={JSON.stringify(rows)} />
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead className="bg-paper text-left text-xs text-muted">
            <tr>
              <th className="px-2 py-2 font-medium">Key</th>
              <th className="px-2 py-2 font-medium">Label</th>
              <th className="px-2 py-2 font-medium">Unit</th>
              <th className="px-2 py-2 font-medium">Type</th>
              <th className="px-2 py-2 font-medium">Group</th>
              <th className="px-2 py-2 font-medium">Key spec</th>
              <th className="px-2 py-2 font-medium">Filter</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id ?? `n${i}`} className="border-t border-line">
                <td className="p-1"><input value={r.key} onChange={(e) => update(i, { key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} className="w-36 rounded border border-line px-2 py-1.5 font-mono" aria-label="Key" required /></td>
                <td className="p-1"><input value={r.label} onChange={(e) => update(i, { label: e.target.value })} className="w-44 rounded border border-line px-2 py-1.5" aria-label="Label" required /></td>
                <td className="p-1"><input value={r.unit} onChange={(e) => update(i, { unit: e.target.value })} className="w-20 rounded border border-line px-2 py-1.5" aria-label="Unit" /></td>
                <td className="p-1">
                  <select value={r.data_type} onChange={(e) => update(i, { data_type: e.target.value })} className="rounded border border-line px-1.5 py-1.5" aria-label="Type">
                    <option value="number">Number</option>
                    <option value="text">Text</option>
                  </select>
                </td>
                <td className="p-1"><input value={r.group_label} onChange={(e) => update(i, { group_label: e.target.value })} className="w-32 rounded border border-line px-2 py-1.5" aria-label="Group" /></td>
                <td className="p-1 text-center"><input type="checkbox" checked={r.is_key_spec} onChange={(e) => update(i, { is_key_spec: e.target.checked })} aria-label="Key spec" className="h-4 w-4 accent-[var(--color-accent)]" /></td>
                <td className="p-1 text-center"><input type="checkbox" checked={r.is_filterable} disabled={r.data_type !== "number"} onChange={(e) => update(i, { is_filterable: e.target.checked })} aria-label="Filterable" className="h-4 w-4 accent-[var(--color-accent)]" /></td>
                <td className="whitespace-nowrap p-1">
                  <button type="button" onClick={() => move(i, -1)} className="px-1.5 text-muted hover:text-ink" aria-label="Move up">↑</button>
                  <button type="button" onClick={() => move(i, 1)} className="px-1.5 text-muted hover:text-ink" aria-label="Move down">↓</button>
                  <button type="button" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} className="px-1.5 text-danger" aria-label="Remove attribute">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        Key specs show as ranges on product cards and pages. Filterable numeric attributes appear in the model finder. Removing an
        attribute deletes its values from every model.
      </p>
    </ActionForm>
  );
}
