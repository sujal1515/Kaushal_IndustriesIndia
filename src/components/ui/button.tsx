import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "inverse" | "dark";
type Size = "sm" | "md" | "lg";

// Reference button system: flat fills, 4px radius, 600 weight, no shadows.
const variants: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-accent",
  secondary: "border border-line-strong bg-transparent text-ink hover:border-ink",
  ghost: "text-ink hover:bg-ink/5",
  inverse: "bg-paper text-ink hover:bg-sky hover:text-cocoa",
  dark: "bg-ink text-paper hover:bg-cocoa",
};

const sizes: Record<Size, string> = {
  sm: "px-5 py-2 text-[0.95rem] gap-2",
  md: "px-6 py-3 text-base gap-2.5",
  lg: "px-8 py-4 text-[1.125rem] gap-3",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cn(
    "inline-flex select-none items-center justify-center whitespace-nowrap rounded-[0.25rem] font-semibold leading-[1.2] tracking-[-0.01em]",
    "transition-[background-color,border-color,color] duration-[450ms] ease-[var(--ease-expo)]",
    "disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    extra,
  );
}

export function ButtonLink({
  variant,
  size,
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; children: ReactNode }) {
  return (
    <Link className={buttonClass(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}

export function Button({
  variant,
  size,
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}
