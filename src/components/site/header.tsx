"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { SearchIndexItem } from "@/lib/data/catalogue";
import { mainNav, telHref, whatsappHref } from "@/lib/site";
import { cn } from "@/lib/utils";
import { buttonClass } from "@/components/ui/button";
import { ArrowRight, ChevronDown, Phone, Search, WhatsApp } from "@/components/ui/icons";
import { gsap } from "@/components/motion/gsap";
import { Logo } from "./logo";
import { QuickSearch } from "./quick-search";
import { TrackedAnchor, TrackedLink } from "./tracked";

type NavCategory = { slug: string; name: string; description: string | null; product_count: number; image: string | null };
type LenisLike = { stop: () => void; start: () => void };

/**
 * Sticky site header: tucks away while reading down the page and returns on the first scroll
 * up, so navigation, search and "Request a quote" are always one gesture away.
 * - Desktop: underline-wipe links, a products panel with category images, instant search, RFQ.
 * - Below 1280px: a "Menu +" toggle opens a side panel (stacked brand wipes, GSAP) under the bar.
 */
export function Header({
  categories,
  phone,
  whatsapp,
  searchIndex,
}: {
  categories: NavCategory[];
  phone: string;
  whatsapp: string;
  searchIndex: SearchIndexItem[];
}) {
  const pathname = usePathname();
  const [megaOpen, setMegaOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const pinned = megaOpen || menuOpen || searchOpen;

  // Close menus on navigation (adjusting state while rendering, keyed on the path).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMegaOpen(false);
    setMenuOpen(false);
    setSearchOpen(false);
    setHidden(false);
  }

  // Hide on scroll down, show on scroll up. The visible height is shared as --header-offset
  // so sticky elements further down (section bars, sticky columns) sit right under it.
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 4);
      if (Math.abs(y - lastY) < 8) return;
      setHidden(y > lastY && y > 180);
      lastY = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isHidden = hidden && !pinned;
  useEffect(() => {
    document.documentElement.style.setProperty("--header-offset", isHidden ? "0px" : "var(--header-h)");
  }, [isHidden]);

  // Instant search shortcuts: "/" and Ctrl/⌘+K.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable]");
      if ((e.key === "/" && !typing) || (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setMegaOpen(false);
        setMenuOpen((open) => {
          if (open) toggleRef.current?.focus();
          return false;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Side navigation open/close timelines.
  useEffect(() => {
    const wrap = wrapRef.current;
    const toggle = toggleRef.current;
    if (!wrap || !toggle) return;
    const lenis = (window as unknown as { __lenis?: LenisLike }).__lenis;
    const overlay = wrap.querySelector("[data-sidenav-overlay]");
    const menu = wrap.querySelector("[data-sidenav-menu]");
    const panels = wrap.querySelectorAll("[data-sidenav-panel]");
    const links = wrap.querySelectorAll("[data-sidenav-link]");
    const fades = wrap.querySelectorAll("[data-sidenav-fade]");
    const labels = toggle.querySelectorAll("[data-sidenav-label]");
    const icon = toggle.querySelector("[data-sidenav-icon]");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    tl.current ??= gsap.timeline({ defaults: { ease: "main", duration: reduce ? 0 : 0.6 } });
    const t = tl.current;

    if (menuOpen) {
      lenis?.stop();
      t.clear()
        .set(wrap, { display: "block" })
        .set(menu, { xPercent: 0 }, "<")
        .fromTo(labels, { yPercent: 0 }, { yPercent: -100, stagger: 0.1 })
        .fromTo(icon, { rotate: 0 }, { rotate: 135 }, "<")
        .fromTo(overlay, { autoAlpha: 0 }, { autoAlpha: 1 }, "<")
        .fromTo(panels, { xPercent: 101 }, { xPercent: 0, stagger: 0.08, duration: reduce ? 0 : 0.5 }, "<")
        .fromTo(links, { yPercent: 140, rotate: 6 }, { yPercent: 0, rotate: 0, stagger: 0.04 }, "<+=0.25")
        .fromTo(fades, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, stagger: 0.05 }, "<+=0.15");
      const first = wrap.querySelector<HTMLElement>("[data-sidenav-link]");
      setTimeout(() => first?.focus({ preventScroll: true }), 50);
    } else if (wrap.style.display === "block") {
      lenis?.start();
      t.clear()
        .to(overlay, { autoAlpha: 0, duration: reduce ? 0 : 0.4 })
        .to(menu, { xPercent: 105, duration: reduce ? 0 : 0.5 }, "<")
        .to(labels, { yPercent: 0 }, "<")
        .to(icon, { rotate: 0 }, "<")
        .set(wrap, { display: "none" });
    }
  }, [menuOpen]);

  // Navigating closes the side panel instantly.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    tl.current?.clear();
    gsap.set(wrap, { display: "none" });
    gsap.set(toggleRef.current?.querySelectorAll("[data-sidenav-label]") ?? [], { yPercent: 0 });
    gsap.set(toggleRef.current?.querySelector("[data-sidenav-icon]") ?? [], { rotate: 0 });
    (window as unknown as { __lenis?: LenisLike }).__lenis?.start();
  }, [pathname]);

  const trapFocus = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !wrapRef.current || !toggleRef.current) return;
    const focusables = [toggleRef.current, ...wrapRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")];
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const openMega = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMegaOpen(true);
  };
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setMegaOpen(false), 160);
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const linkClass = "u-link text-[1.0625rem] font-medium leading-[1.5] tracking-[-0.01rem] text-ink transition-colors hover:text-accent aria-[current=page]:text-accent";

  return (
    <>
      <header
        className={cn("site-header no-print border-b bg-paper/95 backdrop-blur-md", scrolled ? "border-line" : "border-transparent", menuOpen && "!z-[100]")}
        data-hidden={isHidden || undefined}
        onFocusCapture={() => setHidden(false)}
      >
        <div className="padding-global">
          <div className="flex h-[var(--header-h)] items-center justify-between gap-6">
            <Logo />

            <nav aria-label="Main" className="hidden xl:block">
              <ul className="flex items-center gap-7">
                {mainNav.map((item) =>
                  item.href === "/products" ? (
                    <li key={item.href} onMouseEnter={openMega} onMouseLeave={scheduleClose} className="flex items-center gap-1">
                      <Link href="/products" aria-current={isActive("/products") ? "page" : undefined} className={linkClass}>
                        Products
                      </Link>
                      <button
                        type="button"
                        aria-expanded={megaOpen}
                        aria-controls="products-menu"
                        aria-label="Show product categories"
                        onClick={() => setMegaOpen((v) => !v)}
                        className="grid h-8 w-6 place-items-center text-ink"
                      >
                        <ChevronDown size={16} className={cn("transition-transform duration-500 ease-[var(--ease-nav)]", megaOpen && "rotate-180")} />
                      </button>
                    </li>
                  ) : (
                    <li key={item.href}>
                      <Link href={item.href} aria-current={isActive(item.href) ? "page" : undefined} className={linkClass}>
                        {item.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/search"
                aria-label="Search products and models"
                onClick={(e) => {
                  e.preventDefault();
                  setSearchOpen(true);
                }}
                className="group flex h-11 items-center gap-3 rounded-[0.25rem] px-2.5 text-ink transition-colors hover:bg-ink/5 lg:border lg:border-line-strong lg:pl-3.5 lg:pr-2"
              >
                <Search size={20} />
                <span aria-hidden className="hidden items-center gap-6 text-[0.95rem] text-muted lg:flex">
                  Search
                  <kbd className="rounded-[0.2rem] border border-line-strong px-1.5 font-mono text-[0.75rem] leading-5">/</kbd>
                </span>
              </Link>
              {/* Wrapper controls visibility: buttonClass sets inline-flex, which would override `hidden`. */}
              <span className="hidden sm:contents">
                <TrackedLink href="/request-a-quote" event="quote_start" params={{ location: "header" }} className={buttonClass("primary", "md")}>
                  Request a quote
                </TrackedLink>
              </span>
              <button
                ref={toggleRef}
                type="button"
                onKeyDown={menuOpen ? trapFocus : undefined}
                className="flex h-11 items-center gap-2.5 rounded-[0.25rem] border border-line-strong px-4 text-ink transition-colors hover:border-ink xl:hidden"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
                aria-controls="site-menu"
                onClick={() => setMenuOpen((v) => !v)}
              >
                <span aria-hidden className="flex h-[1.5em] flex-col items-end overflow-hidden text-[1.0625rem] font-medium">
                  <span data-sidenav-label className="block leading-[1.5]">
                    Menu
                  </span>
                  <span data-sidenav-label className="block leading-[1.5]">
                    Close
                  </span>
                </span>
                <span aria-hidden data-sidenav-icon className="grid h-4 w-4 place-items-center">
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                    <path d="M7.33 16V0h1.34v16H7.33Z" />
                    <path d="M16 8.67H0V7.33h16v1.34Z" />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Products panel (desktop) */}
        <div
          id="products-menu"
          onMouseEnter={openMega}
          onMouseLeave={scheduleClose}
          data-open={megaOpen || undefined}
          className={cn(
            "group/mega absolute inset-x-0 top-full hidden border-b border-line bg-paper xl:block",
            "[clip-path:inset(0_0_100%_0)] data-[open]:[clip-path:inset(0_0_0_0)]",
            "transition-[clip-path,visibility] duration-500 ease-[var(--ease-nav)]",
            megaOpen ? "visible" : "invisible",
          )}
        >
          <div className="padding-global grid grid-cols-12 gap-10 py-10">
            <div className="col-span-3 flex flex-col items-start gap-6 border-r border-line pr-10">
              <p className="eyebrow">Products</p>
              <p className="h3">Engines, generating sets and pumps, built in Agra.</p>
              <Link href="/products" tabIndex={megaOpen ? 0 : -1} className="group mt-auto inline-flex items-center gap-2.5 text-[1.0625rem] font-medium text-accent">
                <span className="u-link">View all products</span> <ArrowRight size={18} />
              </Link>
            </div>
            <ul className="col-span-9 grid grid-cols-3 gap-x-6 gap-y-6">
              {categories.map((c, i) => (
                <li
                  key={c.slug}
                  className="translate-y-3 opacity-0 transition-[opacity,transform] duration-500 ease-[var(--ease-expo)] group-data-[open]/mega:translate-y-0 group-data-[open]/mega:opacity-100"
                  style={{ transitionDelay: megaOpen ? `${120 + i * 40}ms` : "0ms" }}
                >
                  <Link href={`/products/${c.slug}`} tabIndex={megaOpen ? 0 : -1} className="group flex gap-4">
                    <span className="media-frame product-tile relative h-20 w-24 shrink-0">
                      {c.image && <Image src={c.image} alt="" fill sizes="96px" className="media-zoom object-contain p-2" />}
                    </span>
                    <span className="min-w-0">
                      <span className="u-link text-[1.0625rem] font-medium tracking-[-0.01em]">{c.name}</span>
                      <span className="mt-1 line-clamp-2 block text-[0.9rem] leading-relaxed text-muted">{c.description}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </header>

      {/* Side navigation (below 1280px) — opens under the header bar */}
      <div ref={wrapRef} id="site-menu" className="fixed inset-x-0 bottom-0 top-[var(--header-h)] z-[90] hidden" onKeyDown={trapFocus}>
        <div data-sidenav-overlay className="absolute inset-0 cursor-pointer bg-ink/40" onClick={() => setMenuOpen(false)} aria-hidden />
        <nav aria-label="Mobile" data-sidenav-menu data-lenis-prevent className="absolute inset-y-0 right-0 w-[35em] max-w-full overflow-y-auto overscroll-contain">
          <div aria-hidden className="absolute inset-0">
            <div data-sidenav-panel className="absolute inset-0 bg-cocoa" />
            <div data-sidenav-panel className="absolute inset-0 bg-bronze" />
            <div data-sidenav-panel className="absolute inset-0 bg-ink" />
          </div>
          <div className="relative flex min-h-full flex-col justify-between gap-16 pb-12 pt-10">
            <ul className="flex w-full flex-col">
              {mainNav.map((item) => (
                <li key={item.href} className="relative h-16 overflow-hidden max-[479px]:h-14">
                  <Link
                    href={item.href}
                    data-sidenav-link
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className="group flex w-full py-3 pl-8 text-white max-[479px]:pl-6"
                  >
                    <span className="block text-[2.75rem] font-medium leading-[0.85] tracking-[-0.04em] transition-transform duration-[550ms] ease-[var(--ease-nav)] group-hover:translate-x-3 group-aria-[current=page]:translate-x-3 max-[479px]:text-[2.25rem]">
                      {item.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="flex flex-col items-start gap-8 px-8 text-white max-[479px]:px-6">
              <ul data-sidenav-fade className="grid w-full grid-cols-2 gap-x-6 gap-y-2.5">
                {categories.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/products/${c.slug}`} className="u-link text-[1rem] font-medium text-white/85 hover:text-white">
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
              <div data-sidenav-fade className="w-full">
                <TrackedLink href="/request-a-quote" event="quote_start" params={{ location: "mobile_menu" }} className={buttonClass("inverse", "lg", "w-full")}>
                  Request a quote
                </TrackedLink>
              </div>
              <div data-sidenav-fade className="flex flex-wrap gap-x-8 gap-y-3 text-[1.0625rem] font-medium">
                <TrackedAnchor href={telHref(phone)} event="contact_click" params={{ method: "phone", location: "mobile_menu" }} className="group inline-flex items-center gap-2">
                  <Phone size={18} /> <span className="u-link">Call</span>
                </TrackedAnchor>
                <TrackedAnchor
                  href={whatsappHref(whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  event="contact_click"
                  params={{ method: "whatsapp", location: "mobile_menu" }}
                  className="group inline-flex items-center gap-2"
                >
                  <WhatsApp size={18} /> <span className="u-link">WhatsApp</span>
                </TrackedAnchor>
              </div>
            </div>
          </div>
        </nav>
      </div>

      <QuickSearch index={searchIndex} open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
