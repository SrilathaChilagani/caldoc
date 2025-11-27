"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const specialties = [
  { name: "Dermatology", slug: "dermatology" },
  { name: "Pediatrics", slug: "pediatrics" },
  { name: "Cardiology", slug: "cardiology" },
  { name: "ENT", slug: "ent" },
  { name: "Orthopedics", slug: "orthopedics" },
  { name: "Psychiatry", slug: "psychiatry" },
];

const loginLinks = [
  { label: "Patient portal", href: "/patient/login", helper: "View appointments & prescriptions" },
  { label: "Provider portal", href: "/provider/appointments", helper: "Manage teleconsultations" },
  { label: "Admin dashboard", href: "/provider/login?next=/admin", helper: "Ops, slots & onboarding" },
  { label: "Pharmacy queue", href: "/provider/login?next=/pharmacy", helper: "Fulfil prescriptions" },
];

export default function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [specialtyOpen, setSpecialtyOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const loginRef = useRef<HTMLDivElement | null>(null);
  const specialtyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (loginRef.current && !loginRef.current.contains(event.target as Node)) {
        setLoginOpen(false);
      }
      if (specialtyRef.current && !specialtyRef.current.contains(event.target as Node)) {
        setSpecialtyOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
      <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-bold">
            T
          </div>
          <span className="text-lg font-semibold text-black tracking-tight">CalDoc</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/" className="text-sm text-gray-700 hover:text-gray-900">
            Home
          </Link>

          <div className="relative" ref={specialtyRef}>
            <button
              type="button"
              onClick={() => setSpecialtyOpen((v) => !v)}
              className="inline-flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900"
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

          <div
            className="relative"
            onMouseEnter={() => setHowOpen(true)}
            onMouseLeave={() => setHowOpen(false)}
          >
            <button
              type="button"
              className="inline-flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900"
            >
              How it works
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
            {howOpen && (
              <div className="absolute left-0 mt-3 w-72 rounded-2xl border border-slate-100 bg-white p-4 shadow-xl">
                <div className="flex flex-col gap-3 text-sm text-slate-700">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">Step 1</p>
                    <p className="font-medium">Find a provider</p>
                    <p className="text-xs text-slate-500">Search by specialty, name, or symptoms</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">Step 2</p>
                    <p className="font-medium">Book & confirm</p>
                    <p className="text-xs text-slate-500">Select a slot, agree to the consent, pay securely</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">Step 3</p>
                    <p className="font-medium">Join your visit</p>
                    <p className="text-xs text-slate-500">Get WhatsApp reminders and video link</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={loginRef}>
            <button
              type="button"
              onClick={() => setLoginOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-gray-800 hover:border-blue-400 hover:text-blue-700"
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
          className="inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100 md:hidden"
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          <svg width="24" height="24" fill="none" stroke="currentColor">
            <path strokeWidth="2" strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-gray-200 md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 sm:px-6">
            <Link href="/" className="rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setMobileOpen(false)}>
              Home
            </Link>
            <Link href="/#specialties" className="rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setMobileOpen(false)}>
              Specialties
            </Link>
            <Link href="/#how-it-works" className="rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setMobileOpen(false)}>
              How it works
            </Link>
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
