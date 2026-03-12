import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { Toaster } from "@/components/Toast";
import { Footer } from "@/components/Footer";
import SiteHeader from "@/components/SiteHeader";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "https://statgap.gg")
  ),
  title: "Statgap.gg - League of Legends stats",
  description: "Search Riot ID and region. View match history and stats on Statgap.gg.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profileFontsUrl =
    "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap";

  return (
    <html lang="en" className="dark">
      <head>
        <link rel="stylesheet" href={profileFontsUrl} />
        <link rel="preconnect" href="https://ddragon.leagueoflegends.com" />
        <link rel="dns-prefetch" href="https://ddragon.leagueoflegends.com" />
        <link rel="preconnect" href="https://raw.communitydragon.org" />
        <link rel="dns-prefetch" href="https://raw.communitydragon.org" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-[var(--background)] text-[var(--foreground)] flex flex-col min-h-screen`}
      >
        <div className="flex-1 flex flex-col"><SiteHeader />{children}</div>
        <Footer />
        <Toaster />
        <ServiceWorkerRegister />
        <SpeedInsights />
      </body>
    </html>
  );
}
