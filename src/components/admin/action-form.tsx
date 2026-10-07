"use client";

import { startTransition, useActionState, useEffect, useState, type ReactNode } from "react";
import type { ActionState } from "@/lib/admin/auth";
import { adminButton } from "./ui";
import { cn } from "@/lib/utils";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Form bound to a server action that returns { ok, message | error }.
 * Dispatches inside a transition (no automatic form reset), so typed values
 * survive validation errors and stay in place after a successful save.
 */
export function ActionForm({
  action,
  children,
  submitLabel = "Save changes",
  className,
  footer,
  confirm,
  variant = "primary",
  onSuccess,
}: {
  action: Action;
  children?: ReactNode;
  submitLabel?: string;
  className?: string;
  footer?: ReactNode;
  confirm?: string;
  variant?: "primary" | "secondary" | "danger";
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!state.at) return;
    const show = setTimeout(() => setVisible(true), 0);
    const hide = state.ok ? setTimeout(() => setVisible(false), 4000) : undefined;
    if (state.ok) onSuccess?.();
    return () => {
      clearTimeout(show);
      if (hide) clearTimeout(hide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      action={formAction}
      className={cn("grid gap-5", className)}
      onSubmit={(e) => {
        e.preventDefault();
        if (confirm && !window.confirm(confirm)) return;
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
    >
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={adminButton(variant)}>
          {pending ? "Working…" : submitLabel}
        </button>
        {footer}
        {visible && (state.message || state.error) && (
          <p role="status" className={cn("text-sm", state.ok ? "text-accent" : "text-danger")}>
            {state.ok ? `✓ ${state.message}` : state.error}
          </p>
        )}
      </div>
    </form>
  );
}
