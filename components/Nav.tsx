"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/kalkulatori", label: "Калкулатори" },
  { href: "/pari/dalg", label: "Дълг" },
  { href: "/parlament", label: "Парламент" },
  { href: "/statistiki", label: "Статистики" },
  { href: "/proverki", label: "Проверки" },
  { href: "/metodologiya", label: "Как работим" },
];

export function Nav() {
  const path = usePathname();
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
              (active ? "text-ink border-red" : "text-muted border-transparent hover:text-ink")
            }
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
