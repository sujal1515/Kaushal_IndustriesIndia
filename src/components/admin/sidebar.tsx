"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowUpRight, Close, Logout, Menu } from "@/components/ui/icons";

export type NavItem = { href: string; label: string; badge?: number };

export function AdminSidebar({
  items,
  user,
  signOut,
}: {
  items: NavItem[];
  user: { email: string; role: string };
  signOut: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <>
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-paper/95 px-4 backdrop-blur lg:hidden">
        <span className="font-semibold tracking-[-0.02em]">Kaushal Admin</span>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Toggle navigation" aria-expanded={open} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-ink/5">
          {open ? <Close /> : <Menu />}
        </button>
      </div>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-line bg-surface transition-transform duration-300 lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center border-b border-line px-5">
          <Link href="/admin" className="font-semibold tracking-[-0.02em]" onClick={() => setOpen(false)}>
            Kaushal Admin
          </Link>
        </div>
        <nav aria-label="Admin" className="flex-1 overflow-y-auto p-3">
          <ul className="grid gap-0.5">
            {items.map((i) => (
              <li key={i.href}>
                <Link
                  href={i.href}
                  onClick={() => setOpen(false)}
                  aria-current={active(i.href) ? "page" : undefined}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                    active(i.href) ? "bg-ink text-white" : "text-ink-soft hover:bg-ink/5 hover:text-ink",
                  )}
                >
                  {i.label}
                  {!!i.badge && (
                    <span className={cn("rounded-full px-1.5 text-xs font-medium", active(i.href) ? "bg-white/20" : "bg-accent text-white")}>
                      {i.badge}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/" target="_blank" className="mt-4 flex items-center gap-1.5 px-3 py-2 text-sm text-muted hover:text-ink">
            View website <ArrowUpRight size={14} />
          </Link>
        </nav>
        <div className="border-t border-line p-4">
          <p className="truncate text-sm font-medium">{user.email}</p>
          <p className="text-xs text-muted">{user.role}</p>
          <form action={signOut} className="mt-3">
            <button type="submit" className="flex items-center gap-2 text-sm text-muted hover:text-ink">
              <Logout size={16} /> Sign out
            </button>
          </form>
        </div>
      </aside>
      {open && <button type="button" aria-label="Close navigation" className="fixed inset-0 z-40 bg-ink/30 lg:hidden" onClick={() => setOpen(false)} />}
    </>
  );
}
