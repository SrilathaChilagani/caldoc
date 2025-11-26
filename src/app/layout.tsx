// src/app/layout.tsx
import "./globals.css";
import { Inter } from "next/font/google";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Telemed",
  description: "Virtual consultation platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* Global white background */}
      <body className={`${inter.className} bg-white text-gray-900 min-h-screen`}>
        <SiteHeader />
        <main className="min-h-[calc(100vh-64px-280px)]">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
