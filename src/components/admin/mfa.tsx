"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/browser";
import { adminButton, inputClass } from "./ui";

/** Verify a TOTP code to reach AAL2 (shown after sign-in when MFA is enrolled). */
export function MfaVerify({ next }: { next: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const sb = getBrowserClient();
    const { data: factors, error: listError } = await sb.auth.mfa.listFactors();
    const factor = factors?.totp.find((f) => f.status === "verified");
    if (listError || !factor) {
      setError("No authenticator is set up for this account.");
      setBusy(false);
      return;
    }
    const { error: vErr } = await sb.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() });
    if (vErr) {
      setError("That code didn't work. Check the time on your phone and try again.");
      setBusy(false);
      return;
    }
    router.replace(next.startsWith("/admin") ? next : "/admin");
    router.refresh();
  };

  return (
    <form onSubmit={verify} className="grid gap-4">
      <label className="grid gap-1.5 text-sm font-medium">
        6-digit code
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoFocus
          className={`${inputClass} text-center font-mono text-lg tracking-[0.4em]`}
        />
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="submit" disabled={busy} className={adminButton("primary", "h-11 w-full")}>
        {busy ? "Verifying…" : "Verify"}
      </button>
    </form>
  );
}

/** Enrol or remove a TOTP authenticator (Account page). */
export function MfaEnroll() {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [enrolled, setEnrolled] = useState<{ id: string } | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    getBrowserClient()
      .auth.mfa.listFactors()
      .then(({ data }) => {
        const f = data?.totp.find((x) => x.status === "verified");
        if (f) setEnrolled({ id: f.id });
      });
  }, []);

  const start = async () => {
    setMsg(null);
    const sb = getBrowserClient();
    // Clean up any unfinished enrolment first.
    const { data } = await sb.auth.mfa.listFactors();
    for (const f of data?.all ?? []) if (f.status === "unverified") await sb.auth.mfa.unenroll({ factorId: f.id });
    const { data: e, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${Date.now()}` });
    if (error || !e) return setMsg(error?.message ?? "Could not start enrolment.");
    setFactorId(e.id);
    setQr(e.totp.qr_code);
    setSecret(e.totp.secret);
  };

  const confirm = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!factorId) return;
    const { error } = await getBrowserClient().auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    if (error) return setMsg("That code didn't work — try the next one.");
    setEnrolled({ id: factorId });
    setFactorId(null);
    setQr(null);
    setMsg("Two-step verification is on.");
    router.refresh();
  };

  const remove = async () => {
    if (!enrolled || !window.confirm("Turn off two-step verification?")) return;
    const { error } = await getBrowserClient().auth.mfa.unenroll({ factorId: enrolled.id });
    if (error) return setMsg(error.message);
    setEnrolled(null);
    setMsg("Two-step verification is off.");
    router.refresh();
  };

  if (enrolled && !qr) {
    return (
      <div className="flex flex-wrap items-center gap-4">
        <p className="text-sm">
          <span className="font-medium text-accent">On.</span> You&apos;ll be asked for a code from your authenticator app
          when you sign in.
        </p>
        <button type="button" onClick={remove} className={adminButton("danger")}>
          Turn off
        </button>
        {msg && <p className="text-sm text-muted">{msg}</p>}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {!qr ? (
        <div className="flex flex-wrap items-center gap-4">
          <p className="text-sm text-muted">Protect your account with an authenticator app (Google Authenticator, 1Password, Authy…).</p>
          <button type="button" onClick={start} className={adminButton("primary")}>
            Set up two-step verification
          </button>
        </div>
      ) : (
        <form onSubmit={confirm} className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
          {/* eslint-disable-next-line @next/next/no-img-element -- data URI QR from Supabase */}
          <img src={qr} alt="QR code to add Kaushal admin to your authenticator app" className="h-44 w-44 rounded-lg border border-line bg-white p-2" />
          <div className="grid gap-3">
            <p className="text-sm text-muted">
              Scan the code, or enter this key manually: <code className="break-all font-mono text-ink">{secret}</code>
            </p>
            <label className="grid gap-1.5 text-sm font-medium">
              Enter the 6-digit code to confirm
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                maxLength={6}
                required
                className={`${inputClass} max-w-40 font-mono tracking-[0.3em]`}
              />
            </label>
            <button type="submit" className={adminButton("primary", "w-fit")}>
              Confirm
            </button>
          </div>
        </form>
      )}
      {msg && <p className="text-sm text-muted">{msg}</p>}
    </div>
  );
}
