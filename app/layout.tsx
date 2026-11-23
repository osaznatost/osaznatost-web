import type { Metadata } from "next";
import Link from "next/link";
import { ReportError } from "@/components/ReportError";
import { Suspense } from "react";
import "@fontsource-variable/sofia-sans";
import "@fontsource/sofia-sans-semi-condensed/cyrillic-400.css";
import "@fontsource/sofia-sans-semi-condensed/cyrillic-600.css";
import "@fontsource/sofia-sans-semi-condensed/latin-400.css";
import "@fontsource/sofia-sans-semi-condensed/latin-600.css";
import "@fontsource/sofia-sans-extra-condensed/cyrillic-800.css";
import "@fontsource/sofia-sans-extra-condensed/latin-800.css";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { ResponsiveTables } from "@/components/ResponsiveTables";

export const metadata: Metadata = {
  title: { default: "Осъзнатост", template: "%s · Осъзнатост" },
  description: "Какво прави държавата. С числа и източници.",
  metadataBase: new URL("https://osaznatost.pavlin140.workers.dev"),
  openGraph: { siteName: "Осъзнатост", locale: "bg_BG", type: "website", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Осъзнатост — какво прави държавата, с числа и източници" }] },
  // докато е вътрешен прототип с парола, търсачките не индексират
  robots: process.env.SITE_PASSWORD ? { index: false, follow: false } : { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bg">
      <body className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1 min-h-[100svh]">{children}</main>
        <Suspense fallback={null}><ResponsiveTables /></Suspense>
        <footer className="bg-surface border-t border-rule mt-20">
          <div className="mx-auto max-w-[88rem] px-4 sm:px-6 py-8 text-sm text-muted grid gap-2 sm:grid-cols-2">
            <p>
              Не подкрепяме партия, кандидат или правителство. Всяко число има източник и дата.{" "}
              <Link href="/metodologiya">Как работим</Link> · <Link href="/rechnik">Речник</Link> · <Link href="/sastoyanie">Състояние на данните</Link> · <Suspense fallback={<a href="/metodologiya#greshki">Съобщи за грешка</a>}><ReportError /></Suspense>
            </p>
            <p className="sm:text-right">Вътрешен прототип · данните са към датите, посочени до тях</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
