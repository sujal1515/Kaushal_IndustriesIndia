import type { LabelValue } from "@/lib/types";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function str(fd: FormData, key: string, { required = false, max = 2000 } = {}) {
  const v = String(fd.get(key) ?? "").trim();
  if (required && !v) throw new Error(`${humanise(key)} is required.`);
  if (v.length > max) throw new Error(`${humanise(key)} is too long (max ${max} characters).`);
  return v;
}

export function optStr(fd: FormData, key: string, max = 2000) {
  const v = str(fd, key, { max });
  return v || null;
}

export function int(fd: FormData, key: string, fallback = 0) {
  const n = Number(fd.get(key));
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export function bool(fd: FormData, key: string) {
  return fd.get(key) === "on" || fd.get(key) === "true";
}

export function slug(fd: FormData, key = "slug") {
  const v = str(fd, key, { required: true, max: 120 }).toLowerCase();
  if (!SLUG.test(v)) throw new Error("Slug may contain only lowercase letters, numbers and single hyphens.");
  return v;
}

export function oneOf<T extends string>(fd: FormData, key: string, allowed: readonly T[]): T {
  const v = String(fd.get(key) ?? "");
  if (!allowed.includes(v as T)) throw new Error(`Invalid ${humanise(key)}.`);
  return v as T;
}

/** One item per line, blanks removed. */
export function lines(fd: FormData, key: string) {
  return String(fd.get(key) ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/** "Label: value" per line. */
export function labelLines(fd: FormData, key: string): LabelValue[] {
  return lines(fd, key).map((l, i) => {
    const idx = l.indexOf(":");
    if (idx <= 0) throw new Error(`${humanise(key)}, line ${i + 1}: use the format "Label: value".`);
    return { label: l.slice(0, idx).trim(), value: l.slice(idx + 1).trim() };
  });
}

export function facets(fd: FormData, key: string): Record<string, string> {
  return Object.fromEntries(labelLines(fd, key).map((x) => [x.label, x.value]));
}

export function date(fd: FormData, key: string) {
  const v = String(fd.get(key) ?? "").trim();
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error(`${humanise(key)} must be a date.`);
  return v;
}

export function ids(fd: FormData, key: string) {
  return fd
    .getAll(key)
    .map(String)
    .filter((v) => /^[0-9a-f-]{36}$/i.test(v));
}

function humanise(key: string) {
  const s = key.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function dbError(error: { message: string; code?: string } | null) {
  if (!error) return;
  if (error.code === "23505") throw new Error("That slug or code is already in use.");
  if (error.code === "23503") throw new Error("This item is still referenced elsewhere. Remove those links first.");
  if (error.code === "42501") throw new Error("You don't have permission to do that.");
  throw new Error(error.message);
}
