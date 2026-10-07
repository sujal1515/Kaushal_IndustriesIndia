// Central place for environment flags. NEXT_PUBLIC_* values must be read
// with static property access so Next.js can inline them at build time.

export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  gtmId: process.env.NEXT_PUBLIC_GTM_ID ?? "",
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
};

export const isSupabaseConfigured = Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);

/** Server-only values. Never import this object into a client component. */
export function serverEnv() {
  return {
    supabaseServiceKey:
      process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    emailFrom: process.env.EMAIL_FROM ?? "Kaushal Industries <enquiries@notify.kia-india.com>",
    notifyEmails: (process.env.ENQUIRY_NOTIFY_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    turnstileSecret: process.env.TURNSTILE_SECRET_KEY ?? "",
    ipHashSalt: process.env.IP_HASH_SALT ?? "kaushal-default-salt-change-me",
  };
}

export const STORAGE_BUCKETS = {
  productImages: "product-images",
  documents: "documents",
  siteMedia: "site-media",
} as const;

/** Resolve a stored path to a public URL. Local paths (/images/...) and absolute URLs pass through. */
export function mediaUrl(path: string | null | undefined, bucket: string = STORAGE_BUCKETS.productImages) {
  if (!path) return null;
  if (path.startsWith("/") || /^https?:\/\//.test(path)) return path;
  if (!publicEnv.supabaseUrl) return null;
  const [maybeBucket, ...rest] = path.split("/");
  // Allow "bucket/key" paths as well as bare keys.
  const knownBuckets: string[] = Object.values(STORAGE_BUCKETS);
  const b = knownBuckets.includes(maybeBucket) && rest.length ? maybeBucket : bucket;
  const key = b === maybeBucket ? rest.join("/") : path;
  return `${publicEnv.supabaseUrl}/storage/v1/object/public/${b}/${key.split("/").map(encodeURIComponent).join("/")}`;
}
