import type { Metadata } from "next";
import Link from "next/link";
import "@fontsource-variable/sofia-sans";
import "@fontsource/sofia-sans-semi-condensed/cyrillic-400.css";
import "@fontsource/sofia-sans-semi-condensed/cyrillic-600.css";
import "@fontsource/sofia-sans-semi-condensed/latin-400.css";
import "@fontsource/sofia-sans-semi-condensed/latin-600.css";
import "@fontsource/sofia-sans-extra-condensed/cyrillic-800.css";
import "@fontsource/sofia-sans-extra-condensed/latin-800.css";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: { default: "Осъзнатост", template: "%s · Осъзнатост" },
  description: "Какво прави държавата. С числа и източници.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bg">
      <body className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1">{children}</main>
        <footer className="bg-surface border-t border-rule mt-20">
          <div className="mx-auto max-w-[88rem] px-4 sm:px-6 py-8 text-sm text-muted grid gap-2 sm:grid-cols-2">
            <p>
              Не подкрепяме партия, кандидат или правителство. Всяко число има източник и дата.{" "}
              <Link href="/metodologiya">Как работим</Link>
            </p>
            <p className="sm:text-right">Вътрешен прототип · данните са към датите, посочени до тях</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
