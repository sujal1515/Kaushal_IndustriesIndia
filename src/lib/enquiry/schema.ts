import { z } from "zod";
import { BUYER_TYPES, COUNTRY_CODES, QUANTITY_UNITS, TIMELINES } from "./options";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Please keep this under ${max} characters.`)
    .optional()
    .transform((v) => (v ? v : undefined));

const country = z
  .string()
  .trim()
  .refine((v) => COUNTRY_CODES.has(v), "Please choose a country.");

/**
 * Shared RFQ / contact validation (blueprint §5.3). Used on the server for every
 * submission; the client mirrors the same rules through native constraints.
 */
export const enquirySchema = z
  .object({
    type: z.enum(["rfq", "contact", "distributor"]),
    product: optionalText(120),
    model: optionalText(40),
    quantity: z
      .union([z.literal(""), z.coerce.number().int("Whole numbers only.").min(1, "Enter at least 1.").max(100000, "For orders above 100,000 please contact us directly.")])
      .optional()
      .transform((v) => (v === "" || v === undefined ? undefined : v)),
    quantity_unit: z.enum(QUANTITY_UNITS.map((u) => u.value) as [string, ...string[]]).optional(),
    application: optionalText(80),
    application_other: optionalText(200),
    destination_country: z.union([z.literal(""), country]).optional(),
    destination_city_port: optionalText(120),
    timeline: z
      .union([z.literal(""), z.enum(TIMELINES.map((t) => t.value) as [string, ...string[]])])
      .optional(),
    name: z.string().trim().min(2, "Please enter your name.").max(120),
    company: optionalText(160),
    email: z.email("Please enter a valid email address.").trim().max(200),
    phone: z
      .string()
      .trim()
      .max(30)
      .optional()
      .refine((v) => !v || /^\+?[\d\s()-]{7,25}$/.test(v), "Please enter a valid phone number, including country code."),
    buyer_country: z.union([z.literal(""), country]).optional(),
    buyer_type: z.union([z.literal(""), z.enum(BUYER_TYPES.map((b) => b.value) as [string, ...string[]])]).optional(),
    message: optionalText(4000),
    consent: z.literal("on", { error: "Please agree so we can respond to your enquiry." }),
  })
  .superRefine((v, ctx) => {
    if (v.type === "rfq") {
      if (!v.product && !v.message)
        ctx.addIssue({ code: "custom", path: ["product"], message: "Choose a product, or describe what you need in the message." });
      if (!v.quantity) ctx.addIssue({ code: "custom", path: ["quantity"], message: "Please enter the quantity you need." });
      if (!v.destination_country)
        ctx.addIssue({ code: "custom", path: ["destination_country"], message: "Please choose the destination country." });
      if (!v.timeline) ctx.addIssue({ code: "custom", path: ["timeline"], message: "Please choose a timeline." });
      if (v.application === "other" && !v.application_other)
        ctx.addIssue({ code: "custom", path: ["application_other"], message: "Please describe the application." });
    }
    if (v.type === "distributor") {
      if (!v.company) ctx.addIssue({ code: "custom", path: ["company"], message: "Please enter your company name." });
      if (!v.buyer_country) ctx.addIssue({ code: "custom", path: ["buyer_country"], message: "Please choose your country." });
      if (!v.message) ctx.addIssue({ code: "custom", path: ["message"], message: "Tell us about your company and territory." });
    }
    if (v.type === "contact" && !v.message) {
      ctx.addIssue({ code: "custom", path: ["message"], message: "Please enter your message." });
    }
  });

export type EnquiryInput = z.infer<typeof enquirySchema>;

/**
 * Type-specific required fields, checked on the raw values. Zod skips superRefine when a
 * base field fails, so the server merges these in to report every missing field at once.
 */
export function requiredFieldErrors(raw: Record<string, string>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const need = (cond: boolean, field: string, message: string) => {
    if (cond) out[field] = [message];
  };
  const has = (k: string) => Boolean(raw[k]?.trim());
  if (raw.type === "distributor") {
    need(!has("company"), "company", "Please enter your company name.");
    need(!has("buyer_country"), "buyer_country", "Please choose your country.");
    need(!has("message"), "message", "Tell us about your company and territory.");
  } else if (raw.type === "contact") {
    need(!has("message"), "message", "Please enter your message.");
  } else {
    need(!has("product") && !has("message"), "product", "Choose a product, or describe what you need in the message.");
    need(!has("quantity"), "quantity", "Please enter the quantity you need.");
    need(!has("destination_country"), "destination_country", "Please choose the destination country.");
    need(!has("timeline"), "timeline", "Please choose a timeline.");
    need(raw.application === "other" && !has("application_other"), "application_other", "Please describe the application.");
  }
  return out;
}

export type EnquiryFormState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  values?: Record<string, string>;
};
