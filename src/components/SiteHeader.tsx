"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { IMAGES } from "@/lib/imagePaths";

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

  const headerClassName = isHome
    ? "sticky top-0 z-50 border-b border-transparent bg-transparent"
    : "sticky top-0 z-50 border-b border-gray-200 bg-white";
  const navLinkClassName = isHome
    ? "text-sm text-slate-800 hover:text-slate-950"
    : "text-sm text-gray-700 hover:text-gray-900";
  const dropdownTriggerClassName = isHome
    ? "inline-flex items-center gap-1 text-sm text-slate-800 hover:text-slate-950"
    : "inline-flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900";
  const loginButtonClassName = isHome
    ? "inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-medium text-slate-800 backdrop-blur hover:border-slate-300 hover:text-slate-950"
    : "inline-flex items-center gap-1 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-gray-800 hover:border-blue-400 hover:text-blue-700";
  const mobileToggleClassName = isHome
    ? "inline-flex items-center justify-center rounded-md p-2 text-slate-800 hover:bg-white/40 md:hidden"
    : "inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100 md:hidden";

  return (
    <header className={headerClassName}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
      <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80">
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
            <span className="text-[11px] text-slate-600 tracking-wide uppercase">Telemedicine made simple</span>
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
        <div className="border-t border-gray-200 bg-white/95 backdrop-blur md:hidden">
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
          </nav>
        </div>
      )}
    </header>
  );
}
