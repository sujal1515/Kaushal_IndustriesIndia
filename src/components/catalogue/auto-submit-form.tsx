"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type ComponentProps } from "react";

/**
 * GET form that works without JavaScript (an Apply button is rendered) and,
 * once hydrated, applies filters immediately on change without a full reload.
 */
export function AutoSubmitForm({ action, children, ...props }: ComponentProps<"form"> & { action: string }) {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    ref.current?.querySelectorAll<HTMLElement>(".js-hide").forEach((el) => (el.hidden = true));
  }, []);

  const navigate = () => {
    const form = ref.current;
    if (!form) return;
    const [path, hash] = action.split("#");
    const params = new URLSearchParams();
    new FormData(form).forEach((v, k) => {
      if (typeof v === "string" && v) params.set(k, v);
    });
    const qs = params.toString();
    router.replace(`${path}${qs ? `?${qs}` : ""}${hash ? `#${hash}` : ""}`, { scroll: false });
  };

  return (
    <form
      ref={ref}
      method="get"
      action={action}
      onChange={navigate}
      onSubmit={(e) => {
        e.preventDefault();
        navigate();
      }}
      {...props}
    >
      {children}
    </form>
  );
}
