/**
 * Verifies every legacy URL redirects permanently to a page that returns 200 (blueprint §9.3).
 *   npm run test:redirects -- https://www.kia-india.com
 */
import { readFileSync } from "node:fs";

const base = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const src = readFileSync(new URL("../src/lib/legacy-redirects.ts", import.meta.url), "utf8");
const pairs = [...src.matchAll(/from: "([^"]+)", to: "([^"]+)"/g)].map((m) => ({ from: m[1], to: m[2] }));

let failed = 0;
for (const { from, to } of pairs) {
  const r = await fetch(base + from, { redirect: "manual" });
  const loc = r.headers.get("location") ?? "";
  const dest = new URL(loc || "/", base);
  const final = await fetch(dest, { redirect: "manual" });
  const ok = [301, 308].includes(r.status) && dest.pathname === to && final.status === 200;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${r.status} ${from} -> ${dest.pathname} (${final.status})${ok ? "" : `  expected ${to}`}`);
}
console.log(`\n${pairs.length - failed}/${pairs.length} legacy URLs OK`);
process.exit(failed ? 1 : 0);
