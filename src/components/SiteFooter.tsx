import Image from "next/image";
import Link from "next/link";
import DisclaimerNotice from "./DisclaimerNotice";
import { IMAGES } from "@/lib/imagePaths";

export default function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80">
                <Image src={IMAGES.LOGO_MARK} alt="CalDoc icon" width={36} height={36} />
              </div>
              <Image
                src={IMAGES.COMPANY_NAME}
                alt="CalDoc logo"
                width={120}
                height={28}
                className="object-contain"
              />
            </div>
            <p className="text-sm text-gray-600">
              Book online medical appointments with trusted providers across India.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900">Explore</h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li><Link href="/providers" className="hover:text-gray-900">Find a doctor</Link></li>
              <li>
                <Link href="/specialties" target="_blank" rel="noreferrer" className="hover:text-gray-900">
                  Specialties
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" target="_blank" rel="noreferrer" className="hover:text-gray-900">
                  How it works
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900">Company</h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li>
                <Link href="/about" target="_blank" rel="noreferrer" className="hover:text-gray-900">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" target="_blank" rel="noreferrer" className="hover:text-gray-900">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/careers" target="_blank" rel="noreferrer" className="hover:text-gray-900">
                  Careers
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900">Legal</h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li>
                <Link href="/terms" target="_blank" rel="noreferrer" className="hover:text-gray-900">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" target="_blank" rel="noreferrer" className="hover:text-gray-900">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/disclaimer" target="_blank" rel="noreferrer" className="hover:text-gray-900">
                  Telemedicine Disclaimer
                </Link>
              </li>
              <li>
                <Link href="/compliance" target="_blank" rel="noreferrer" className="hover:text-gray-900">
                  TPG 2020 &amp; DPDP Compliance
                </Link>
              </li>
              <li>
                <a href="mailto:grievance@telemed.in" className="hover:text-gray-900">
                  Grievance Officer
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8">
          <DisclaimerNotice />
        </div>

        <div className="mt-6 border-t border-gray-200 pt-6 text-xs text-gray-500 space-y-1">
          <p>© {new Date().getFullYear()} CalDoc India. All rights reserved.</p>
          <p>
            Telemedicine services governed by the{" "}
            <Link href="/compliance" className="underline hover:text-gray-700">
              Telemedicine Practice Guidelines 2020
            </Link>{" "}
            (MoHFW, India) &amp; DPDP Act, 2023. Not for emergencies — call{" "}
            <strong>112</strong> in India.
          </p>
        </div>
      </div>
    </footer>
  );
}
