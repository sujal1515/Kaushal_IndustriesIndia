"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { submitEnquiry } from "@/app/actions/enquiry";
import type { EnquiryFormState } from "@/lib/enquiry/schema";
import { BUYER_TYPES, QUANTITY_UNITS, TIMELINES } from "@/lib/enquiry/options";
import { publicEnv } from "@/lib/env";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { buttonClass } from "@/components/ui/button";
import { ArrowRight } from "@/components/ui/icons";
import { Turnstile } from "./turnstile";

export type FormProduct = {
  slug: string;
  name: string;
  category: string;
  models: string[];
  status: string;
};

type Mode = "rfq" | "distributor" | "contact";

const initial: EnquiryFormState = { status: "idle" };

export function EnquiryForm({
  mode: initialMode,
  allowTypeSwitch = false,
  products = [],
  applications = [],
  defaults = {},
  countryList,
}: {
  countryList: { code: string; name: string }[];
  mode: Mode;
  allowTypeSwitch?: boolean;
  products?: FormProduct[];
  applications?: { slug: string; name: string }[];
  defaults?: { product?: string; model?: string; application?: string };
}) {
  const [state, formAction, pending] = useActionState(submitEnquiry, initial);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [productSlug, setProductSlug] = useState(state.values?.product ?? defaults.product ?? "");
  const [application, setApplication] = useState(state.values?.application ?? defaults.application ?? "");
  const [startedAt] = useState(() => Date.now());
  const [attempt, setAttempt] = useState(0);
  const startedTracking = useRef(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const v = state.values ?? {};
  const err = (name: string) => state.fieldErrors?.[name]?.[0];
  const product = products.find((p) => p.slug === productSlug);

  useEffect(() => {
    if (state.status === "error") {
      summaryRef.current?.focus();
      const t = setTimeout(() => setAttempt((n) => n + 1), 0);
      return () => clearTimeout(t);
    }
  }, [state]);

  const onFirstFocus = () => {
    if (startedTracking.current) return;
    startedTracking.current = true;
    track("quote_start", { location: "form", form_type: mode, product: productSlug || undefined });
  };

  const grouped = useMemo(() => {
    const map = new Map<string, FormProduct[]>();
    for (const p of products) map.set(p.category, [...(map.get(p.category) ?? []), p]);
    return [...map.entries()];
  }, [products]);

  const errorEntries = Object.entries(state.fieldErrors ?? {}).filter(([, e]) => e && e.length);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        // JS path: submit without React's automatic form reset so entered values persist on error.
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
      onFocus={onFirstFocus}
      noValidate
      className="grid gap-10"
      aria-describedby={state.status === "error" ? "form-errors" : undefined}
    >
      <input type="hidden" name="type" value={mode} />
      <input type="hidden" name="started_at" value={startedAt} />
      {/* Honeypot — hidden from people and assistive tech */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {state.status === "error" && (
        <div
          id="form-errors"
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-[0.25rem] border border-danger/30 bg-danger-soft p-5 text-[1rem] text-danger outline-none"
        >
          <p className="font-medium">{state.message}</p>
          {errorEntries.length > 0 && (
            <ul className="mt-2 grid gap-1">
              {errorEntries.map(([k, e]) => (
                <li key={k}>
                  <a href={`#f-${k}`} className="underline underline-offset-2">
                    {e![0]}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {allowTypeSwitch && (
        <fieldset>
          <legend className="form-label mb-4">I am</legend>
          <div className="inline-flex flex-wrap gap-2">
            {(
              [
                ["rfq", "Requesting a quotation"],
                ["distributor", "Interested in distribution"],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                aria-pressed={mode === val}
                onClick={() => setMode(val)}
                className={cn(
                  "rounded-[0.25rem] border px-4 py-2.5 text-[1rem] font-medium transition-colors duration-300",
                  mode === val ? "border-ink bg-ink text-white" : "border-line-strong text-ink-soft hover:border-ink hover:text-ink",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {mode === "rfq" && (
        <Section title="Your requirement" step="01">
          <Field id="product" label="Product" error={err("product")} className="sm:col-span-2">
            <select
              id="f-product"
              name="product"
              className="form-input"
              value={productSlug}
              onChange={(e) => setProductSlug(e.target.value)}
              aria-invalid={!!err("product")}
              aria-describedby={err("product") ? "e-product" : undefined}
            >
              <option value="">Select a product…</option>
              {grouped.map(([cat, items]) => (
                <optgroup key={cat} label={cat}>
                  {items.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.name}
                      {p.status === "coming_soon" ? " (coming soon)" : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>

          {product && product.models.length > 0 && (
            <Field id="model" label="Model" hint="Optional" error={err("model")}>
              <select
                id="f-model"
                name="model"
                className="form-input"
                defaultValue={v.model ?? (defaults.product === product.slug ? defaults.model : "") ?? ""}
                key={product.slug}
              >
                <option value="">Not sure / any</option>
                {product.models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <div className={cn("grid grid-cols-[1fr_auto] gap-3", !(product && product.models.length) && "sm:col-span-1")}>
            <Field id="quantity" label="Quantity" required error={err("quantity")}>
              <input
                id="f-quantity"
                name="quantity"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                required
                className="form-input"
                defaultValue={v.quantity}
                aria-invalid={!!err("quantity")}
                aria-describedby={err("quantity") ? "e-quantity" : undefined}
              />
            </Field>
            <Field id="quantity_unit" label="Unit">
              <select id="f-quantity_unit" name="quantity_unit" className="form-input" defaultValue={v.quantity_unit ?? "units"}>
                {QUANTITY_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field id="application" label="Application" hint="Optional" error={err("application")}>
            <select
              id="f-application"
              name="application"
              className="form-input"
              value={application}
              onChange={(e) => setApplication(e.target.value)}
            >
              <option value="">Select…</option>
              {applications.map((a) => (
                <option key={a.slug} value={a.slug}>
                  {a.name}
                </option>
              ))}
              <option value="other">Other</option>
            </select>
          </Field>
          {application === "other" && (
            <Field id="application_other" label="Describe the application" required error={err("application_other")}>
              <input
                id="f-application_other"
                name="application_other"
                className="form-input"
                defaultValue={v.application_other}
                aria-invalid={!!err("application_other")}
              />
            </Field>
          )}

          <Field id="destination_country" label="Destination country" required error={err("destination_country")}>
            <select
              id="f-destination_country"
              name="destination_country"
              className="form-input"
              defaultValue={v.destination_country ?? ""}
              aria-invalid={!!err("destination_country")}
              aria-describedby={err("destination_country") ? "e-destination_country" : undefined}
            >
              <option value="">Select country…</option>
              {countryList.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field id="destination_city_port" label="Destination port or city" hint="Optional">
            <input id="f-destination_city_port" name="destination_city_port" className="form-input" defaultValue={v.destination_city_port} />
          </Field>

          <Field id="timeline" label="Timeline" required group error={err("timeline")} className="sm:col-span-2">
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="l-timeline" id="f-timeline">
              {TIMELINES.map((t) => (
                <label key={t.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="timeline"
                    value={t.value}
                    defaultChecked={v.timeline === t.value}
                    className="peer sr-only"
                  />
                  <span className="inline-flex rounded-[0.25rem] border border-line-strong px-4 py-2.5 text-[1rem] font-medium transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent hover:border-ink">
                    {t.label}
                  </span>
                </label>
              ))}
            </div>
          </Field>
        </Section>
      )}

      <Section title={mode === "contact" ? "Your details" : "Your contact details"} step={mode === "rfq" ? "02" : "01"}>
        <Field id="name" label="Full name" required error={err("name")}>
          <input
            id="f-name"
            name="name"
            autoComplete="name"
            required
            className="form-input"
            defaultValue={v.name}
            aria-invalid={!!err("name")}
            aria-describedby={err("name") ? "e-name" : undefined}
          />
        </Field>
        <Field id="company" label="Company" required={mode === "distributor"} hint={mode === "distributor" ? undefined : "Optional"} error={err("company")}>
          <input
            id="f-company"
            name="company"
            autoComplete="organization"
            className="form-input"
            defaultValue={v.company}
            aria-invalid={!!err("company")}
            aria-describedby={err("company") ? "e-company" : undefined}
          />
        </Field>
        <Field id="email" label="Email" required error={err("email")}>
          <input
            id="f-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="form-input"
            defaultValue={v.email}
            aria-invalid={!!err("email")}
            aria-describedby={err("email") ? "e-email" : undefined}
          />
        </Field>
        <Field id="phone" label="Phone / WhatsApp" hint="Include country code" error={err("phone")}>
          <input
            id="f-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+91 …"
            className="form-input"
            defaultValue={v.phone}
            aria-invalid={!!err("phone")}
            aria-describedby={err("phone") ? "e-phone" : undefined}
          />
        </Field>
        {mode !== "contact" && (
          <>
            <Field id="buyer_country" label="Your country" required={mode === "distributor"} hint={mode === "distributor" ? undefined : "Optional"} error={err("buyer_country")}>
              <select
                id="f-buyer_country"
                name="buyer_country"
                className="form-input"
                defaultValue={v.buyer_country ?? ""}
                aria-invalid={!!err("buyer_country")}
                aria-describedby={err("buyer_country") ? "e-buyer_country" : undefined}
              >
                <option value="">Select country…</option>
                {countryList.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="buyer_type" label="You are" hint="Optional">
              <select id="f-buyer_type" name="buyer_type" className="form-input" defaultValue={v.buyer_type ?? (mode === "distributor" ? "distributor" : "")}>
                <option value="">Select…</option>
                {BUYER_TYPES.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}
        <Field
          id="message"
          label={mode === "distributor" ? "About your company and territory" : mode === "contact" ? "Message" : "Additional requirements"}
          required={mode !== "rfq"}
          hint={mode === "rfq" ? "Optional — options, voltage, packing, other products" : undefined}
          error={err("message")}
          className="sm:col-span-2"
        >
          <textarea
            id="f-message"
            name="message"
            rows={5}
            className="form-input"
            defaultValue={v.message}
            aria-invalid={!!err("message")}
            aria-describedby={err("message") ? "e-message" : undefined}
          />
        </Field>
      </Section>

      <div className="grid gap-6">
        <div>
          <label className="flex items-start gap-3 text-[1rem] leading-relaxed text-ink-soft" htmlFor="f-consent">
            <input
              id="f-consent"
              name="consent"
              type="checkbox"
              required
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-accent)]"
              aria-invalid={!!err("consent")}
              aria-describedby={err("consent") ? "e-consent" : undefined}
            />
            <span>
              I agree that Kaushal Industries may store these details and contact me about this enquiry, as described in
              the{" "}
              <Link href="/privacy-policy" className="underline underline-offset-2" target="_blank">
                privacy policy
              </Link>
              .
            </span>
          </label>
          {err("consent") && (
            <p id="e-consent" className="mt-2 text-[0.95rem] text-danger">
              {err("consent")}
            </p>
          )}
        </div>

        {publicEnv.turnstileSiteKey && <Turnstile siteKey={publicEnv.turnstileSiteKey} resetKey={attempt} />}

        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled={pending} className={buttonClass("primary", "lg", "min-w-56")}>
            {pending ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
                Sending…
              </>
            ) : (
              <>
                {mode === "rfq" ? "Send quotation request" : mode === "distributor" ? "Send distributor enquiry" : "Send message"}
                <ArrowRight size={18} />
              </>
            )}
          </button>
          <p className="text-[1rem] text-muted">We reply by email, usually within one business day.</p>
        </div>
      </div>
    </form>
  );
}

function Section({ title, step, children }: { title: string; step: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-6 border-t border-line pt-6">
      <legend className="float-left mb-8 flex w-full items-baseline gap-4">
        <span className="font-mono text-[0.875rem] font-medium text-accent">{step}</span>
        <span className="text-[1.75rem] font-medium leading-tight tracking-[-0.04em]">{title}</span>
      </legend>
      <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({
  id,
  label,
  required,
  hint,
  error,
  className,
  group,
  children,
}: {
  id: string;
  label: string;
  group?: boolean;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  const LabelTag = group ? "span" : "label";
  return (
    <div className={cn("grid content-start gap-1", className)}>
      <LabelTag id={`l-${id}`} htmlFor={group ? undefined : `f-${id}`} className="form-label flex items-baseline justify-between gap-2">
        <span>
          {label}
          {required && (
            <span className="text-danger" aria-hidden>
              {" "}
              *
            </span>
          )}
        </span>
        {hint && <span className="font-sans text-[0.875rem] font-medium normal-case text-muted">{hint}</span>}
      </LabelTag>
      {children}
      {error && (
        <p id={`e-${id}`} className="text-[0.95rem] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
