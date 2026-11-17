"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

const items = [
  { href: "/kalkulatori", label: "Калкулатори" },
  { href: "/ikonomika", label: "Икономика" },
  { href: "/byudzhet", label: "Бюджет" },
  { href: "/parlament", label: "Парламент" },
  { href: "/obeshtaniya", label: "Обещания" },
  { href: "/porachki", label: "Поръчки" },
  { href: "/mesta", label: "Места" },
  { href: "/statistiki", label: "Статистики" },
  { href: "/proverki", label: "Проверки" },
  { href: "/metodologiya", label: "Как работим" },
];

function NavLinks({ path }: { path: string }) {
  return (
    <nav aria-label="Основно меню" className="flex flex-wrap gap-x-5 gap-y-1 text-[15px]">
      {items.map((i) => {
        const active = path === i.href || path.startsWith(i.href + "/");
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={
              "no-underline pb-1 border-b-2 " +
              (active ? "text-white border-red" : "text-white/75 border-transparent hover:text-white")
            }
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}

function ActiveNav() {
  return <NavLinks path={usePathname()} />;
}

/** Активният раздел зависи от адреса; при страници, генерирани при заявка, той идва след първоначалния HTML. */
export function Nav() {
  return (
    <Suspense fallback={<NavLinks path="" />}>
      <ActiveNav />
    </Suspense>
  );
}
