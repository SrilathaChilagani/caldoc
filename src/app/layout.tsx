// src/app/layout.tsx
import "./globals.css";
import { Inter } from "next/font/google";
import type { Metadata, Viewport } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import EmbedAwareLayout from "@/components/EmbedAwareLayout";
import PwaRegister from "@/components/PwaRegister";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#0F62FE",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "CalDoc",
  description: "Virtual consultation platform",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CalDoc",
  },
  icons: {
    apple: "/pwa-icon.png",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* Global white background */}
      <body className={`${inter.className} bg-white text-gray-900 min-h-screen`}>
        <PwaRegister />
        <EmbedAwareLayout header={<SiteHeader />} footer={<SiteFooter />}>
          <main className="min-h-[calc(100vh-64px-280px)]">
            {children}
          </main>
        </EmbedAwareLayout>
      </body>
    </html>
  );
}
