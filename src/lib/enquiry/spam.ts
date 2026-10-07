import "server-only";
import { createHash } from "node:crypto";
import { serverEnv } from "@/lib/env";

/** Minimum time a human needs to fill the form (blueprint §5.2 spam controls). */
export const MIN_FILL_MS = 3000;
export const RATE_LIMIT = { windowMinutes: 10, max: 5 };

export function hashIp(ip: string) {
  return createHash("sha256").update(`${serverEnv().ipHashSalt}:${ip}`).digest("hex");
}

export function clientIp(headers: Headers) {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "0.0.0.0"
  );
}

/** Cloudflare Turnstile server-side verification. Skipped when no secret is configured. */
export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = serverEnv().turnstileSecret;
  if (!secret) return true;
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
