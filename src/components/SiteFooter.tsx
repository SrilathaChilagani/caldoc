import Image from "next/image";
import Link from "next/link";
import DisclaimerNotice from "./DisclaimerNotice";

export default function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80">
                <Image src="/images/logo-mark.png" alt="CalDoc icon" width={36} height={36} priority />
              </div>
              <div className="flex flex-col leading-tight">
                <Image
                  src="/images/company-name.jpg"
                  alt="CalDoc logo"
                  width={120}
                  height={28}
                  className="object-contain"
                  priority
                />
                <span className="text-[10px] uppercase tracking-[0.4em] text-slate-500">Telemedicine made simple</span>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Book online medical appointments with trusted providers across India.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900">Explore</h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li><Link href="/providers" className="hover:text-gray-900">Find a doctor</Link></li>
              <li><Link href="/#specialties" className="hover:text-gray-900">Specialties</Link></li>
              <li><Link href="/#how-it-works" className="hover:text-gray-900">How it works</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900">Company</h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li><Link href="/#about" className="hover:text-gray-900">About</Link></li>
              <li><Link href="/#contact" className="hover:text-gray-900">Contact</Link></li>
              <li><Link href="/#careers" className="hover:text-gray-900">Careers</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900">Legal</h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li><Link href="/terms" className="hover:text-gray-900">Terms</Link></li>
              <li><Link href="/privacy" className="hover:text-gray-900">Privacy</Link></li>
              <li><Link href="/compliance" className="hover:text-gray-900">Compliance</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8">
          <DisclaimerNotice />
        </div>

        <div className="mt-6 border-t border-gray-200 pt-6 text-xs text-gray-500">
          © {new Date().getFullYear()} CalDoc India. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
