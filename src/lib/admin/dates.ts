/**
 * Dates in the admin are entered and shown in India time (Asia/Kolkata), the business's time
 * zone, whatever the browser's own zone.
 */
const IST = "+05:30";

/** "2026-10-17T14:30" (datetime-local, India time) → ISO string; null if invalid. */
export function istInputToIso(v: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(v)) return null;
  const d = new Date(`${v.includes("T") ? v : `${v}T09:00`}:00${IST}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ISO string → "2026-10-17T14:30" in India time, for a datetime-local input. */
export function isoToIstInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 5.5 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}

/** Start and end of "today" in India time, as ISO strings. */
export function istDayBounds(offsetDays = 0) {
  const now = new Date(Date.now() + 5.5 * 3600 * 1000);
  const ymd = now.toISOString().slice(0, 10);
  const start = new Date(`${ymd}T00:00:00${IST}`);
  start.setUTCDate(start.getUTCDate() + offsetDays);
  const end = new Date(start.getTime() + 24 * 3600 * 1000 - 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

/** The time of the current request (server components render once per request). */
export const requestTime = () => Date.now();
