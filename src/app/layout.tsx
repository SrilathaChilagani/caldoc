// src/app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import EmbedAwareLayout from "@/components/EmbedAwareLayout";
import PwaRegister from "@/components/PwaRegister";

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
    icon: [
      { url: "/images/logo-mark.png", type: "image/png" },
    ],
    apple: "/images/logo-mark.png",
    shortcut: "/images/logo-mark.png",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* Global white background */}
      <body className="font-sans text-gray-900 min-h-screen">
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
