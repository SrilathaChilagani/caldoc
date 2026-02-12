"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { IMAGES } from "@/lib/imagePaths";
import { loadRxCart, RX_CART_EVENT } from "@/app/services/rx-delivery/ui/rxCart";
import { loadLabCart, LAB_CART_EVENT } from "@/app/services/labs-at-home/ui/labCart";

const specialties = [
  { name: "Dermatology", slug: "dermatology" },
  { name: "Pediatrics", slug: "pediatrics" },
  { name: "Cardiology", slug: "cardiology" },
  { name: "ENT", slug: "ent" },
  { name: "Orthopedics", slug: "orthopedics" },
  { name: "Psychiatry", slug: "psychiatry" },
];

const serviceLinks = [
  { label: "Online consultation", href: "/providers", description: "Browse doctors & specialties" },
  { label: "Rx delivery", href: "/services/rx-delivery", description: "Order OTC medicines from CalDoc" },
  { label: "Labs at home", href: "/services/labs-at-home", description: "Book doorstep sample collection" },
];

const loginLinks = [
  { label: "Patient portal", href: "/patient/login", helper: "View appointments & prescriptions" },
  { label: "Provider portal", href: "/provider/login", helper: "Manage teleconsultations" },
  { label: "Admin dashboard", href: "/provider/login?next=/admin", helper: "Ops, slots & onboarding" },
  { label: "Pharmacy queue", href: "/pharmacy", helper: "Fulfil prescriptions" },
  { label: "Labs queue", href: "/labs/login?next=/labs", helper: "Manage lab tests" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [specialtyOpen, setSpecialtyOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const loginRef = useRef<HTMLDivElement | null>(null);
  const specialtyRef = useRef<HTMLDivElement | null>(null);
  const servicesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (loginRef.current && !loginRef.current.contains(event.target as Node)) {
        setLoginOpen(false);
      }
      if (specialtyRef.current && !specialtyRef.current.contains(event.target as Node)) {
        setSpecialtyOpen(false);
      }
      if (servicesRef.current && servicesRef.current.contains(event.target as Node)) {
        return;
      }
      setServicesOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isRxRoute = pathname?.startsWith("/services/rx-delivery") ?? false;
  const isLabsRoute = pathname?.startsWith("/services/labs-at-home") ?? false;
  const transparentHeader = isHome || pathname === "/services/rx-delivery" || pathname === "/services/labs-at-home";
  const themedHeader = isRxRoute || isLabsRoute;
  const cartHref = isRxRoute ? "/services/rx-delivery/review" : "/services/labs-at-home/review";

  const cartLabel = useMemo(() => {
    if (isRxRoute) return "Cart";
    if (isLabsRoute) return "Cart";
    return "";
  }, [isRxRoute, isLabsRoute]);

  useEffect(() => {
    if (!isRxRoute && !isLabsRoute) {
      setCartCount(0);
      return;
    }

    const computeCount = () => {
      if (isRxRoute) {
        const items = loadRxCart();
        setCartCount(items.reduce((sum, item) => sum + Math.max(1, item.qty || 0), 0));
        return;
      }
      if (isLabsRoute) {
        const items = loadLabCart();
        setCartCount(items.reduce((sum, item) => sum + Math.max(1, item.qty || 0), 0));
      }
    };

    computeCount();

    const eventName = isRxRoute ? RX_CART_EVENT : LAB_CART_EVENT;
    const handler = () => computeCount();
    window.addEventListener(eventName, handler);
    window.addEventListener("storage", handler);
    window.addEventListener("focus", handler);
    return () => {
      window.removeEventListener(eventName, handler);
      window.removeEventListener("storage", handler);
      window.removeEventListener("focus", handler);
    };
  }, [isRxRoute, isLabsRoute]);
  const headerClassName = transparentHeader
    ? "sticky top-0 z-50 border-b border-transparent bg-transparent"
    : themedHeader
    ? "sticky top-0 z-50 border-b border-[#e7e0d5] bg-[#f7f2ea]"
    : "sticky top-0 z-50 border-b border-gray-200 bg-white";
  const navLinkClassName = transparentHeader
    ? "text-sm text-slate-800 hover:text-slate-950"
    : themedHeader
    ? "text-sm text-slate-800 hover:text-slate-950"
    : "text-sm text-gray-700 hover:text-gray-900";
  const dropdownTriggerClassName = transparentHeader
    ? "inline-flex items-center gap-1 text-sm text-slate-800 hover:text-slate-950"
    : themedHeader
    ? "inline-flex items-center gap-1 text-sm text-slate-800 hover:text-slate-950"
    : "inline-flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900";
  const loginButtonClassName = transparentHeader
    ? "inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-800 hover:border-slate-300 hover:text-slate-950"
    : themedHeader
    ? "inline-flex items-center gap-1 rounded-full border border-[#e7e0d5] bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:border-[#d7cfc3] hover:text-slate-950"
    : "inline-flex items-center gap-1 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-gray-800 hover:border-blue-400 hover:text-blue-700";
  const mobileToggleClassName = transparentHeader
    ? "inline-flex items-center justify-center rounded-md p-2 text-slate-800 hover:bg-white/40 md:hidden"
    : themedHeader
    ? "inline-flex items-center justify-center rounded-md p-2 text-slate-800 hover:bg-white/60 md:hidden"
    : "inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100 md:hidden";

  return (
    <header className={headerClassName}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
      <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-transparent">
            <Image src={IMAGES.LOGO_MARK} alt="CalDoc icon" width={40} height={40} priority />
          </div>
          <div className="flex flex-col leading-tight">
            <Image
              src={IMAGES.COMPANY_NAME}
              alt="CalDoc logo"
              width={140}
              height={32}
              className="object-contain"
              priority
            />
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/" className={navLinkClassName}>
            Home
          </Link>

          <div className="relative" ref={specialtyRef}>
            <button
              type="button"
              onClick={() => setSpecialtyOpen((v) => !v)}
              className={dropdownTriggerClassName}
            >
              Specialties
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                <path
                  d="M5 8l5 5 5-5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {specialtyOpen && (
              <div className="absolute left-0 mt-3 w-64 rounded-2xl border border-slate-100 bg-white p-4 shadow-xl">
                <p className="text-xs font-semibold uppercase text-slate-500">Browse</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  {specialties.map((s) => (
                    <Link
                      key={s.slug}
                      href={`/providers?specialty=${encodeURIComponent(s.slug)}`}
                      className="rounded-lg px-2 py-1 text-slate-700 hover:bg-slate-50"
                      onClick={() => setSpecialtyOpen(false)}
                    >
                      {s.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={servicesRef}>
            <button
              type="button"
              onClick={() => setServicesOpen((v) => !v)}
              className={dropdownTriggerClassName}
            >
              Services
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                <path
                  d="M5 8l5 5 5-5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {servicesOpen && (
              <div className="absolute left-0 mt-3 w-72 rounded-2xl border border-slate-100 bg-white p-4 shadow-xl">
                <div className="flex flex-col gap-2 text-sm">
                  {serviceLinks.map((service) => (
                    <Link
                      key={service.href}
                      href={service.href}
                      className="rounded-xl px-3 py-2 hover:bg-slate-50"
                      onClick={() => setServicesOpen(false)}
                    >
                      <p className="font-semibold text-slate-900">{service.label}</p>
                      <p className="text-xs text-slate-500">{service.description}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={loginRef}>
            <button
              type="button"
              onClick={() => setLoginOpen((v) => !v)}
              className={loginButtonClassName}
            >
              Login
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                <path
                  d="M5 8l5 5 5-5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {loginOpen && (
              <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-slate-100 bg-white p-4 shadow-xl">
                <div className="flex flex-col gap-3 text-sm">
                  {loginLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl px-3 py-2 hover:bg-slate-50"
                      onClick={() => setLoginOpen(false)}
                    >
                      <p className="font-semibold text-slate-900">{link.label}</p>
                      <p className="text-xs text-slate-500">{link.helper}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          {(isRxRoute || isLabsRoute) && (
            <Link
              href={cartHref}
              className={`relative inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${
                themedHeader
                  ? "border-[#e7e0d5] bg-white text-slate-800 hover:border-[#d7cfc3]"
                  : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M3 5h2l2 10h10l2-6H7" />
                <circle cx="9" cy="19" r="1.5" />
                <circle cx="17" cy="19" r="1.5" />
              </svg>
              {cartLabel}
              {cartCount > 0 && (
                <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#2f6ea5] px-1 text-[11px] font-semibold text-white">
                  {cartCount}
                </span>
              )}
            </Link>
          )}
        </nav>

        <button
          onClick={() => setMobileOpen((v) => !v)}
          className={mobileToggleClassName}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          <svg width="24" height="24" fill="none" stroke="currentColor">
            <path strokeWidth="2" strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-gray-200 bg-white/95 md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 sm:px-6">
            <Link href="/" className="rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setMobileOpen(false)}>
              Home
            </Link>
            <Link href="/#specialties" className="rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setMobileOpen(false)}>
              Specialties
            </Link>
            <div className="rounded-2xl border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Services</p>
              <div className="mt-3 flex flex-col gap-2 text-sm">
                {serviceLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-md px-2 py-2 text-gray-700 hover:bg-gray-100"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="mt-2 rounded-2xl border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Logins</p>
              <div className="mt-3 flex flex-col gap-2 text-sm">
                {loginLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md px-2 py-2 text-gray-700 hover:bg-gray-100"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            {(isRxRoute || isLabsRoute) && (
              <Link
                href={cartHref}
                className="rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setMobileOpen(false)}
              >
                Cart{cartCount > 0 ? ` (${cartCount})` : ""}
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
