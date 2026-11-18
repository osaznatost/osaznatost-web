"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

// Разделите са групирани по въпроса, с който идва човек: кой управлява, къде отиват парите, какво става около мен.
const groups: { title: string; items: { href: string; label: string; about: string }[] }[] = [
  {
    title: "Власт",
    items: [
      { href: "/vlast", label: "Властта", about: "Кой решава, как се приемат законите, сигнали" },
      { href: "/parlament", label: "Парламент", about: "Кой как гласува, закони, партии, депутати" },
      { href: "/parlament/zakoni", label: "Всички закони", about: "Етап, вносители, двете страни, сигнали" },
      { href: "/obeshtaniya", label: "Обещания", about: "Какво обещаха правителствата и какво стана" },
      { href: "/proverki", label: "Проверки", about: "Вярно ли е казаното, корупционни дела" },
    ],
  },
  {
    title: "Пари",
    items: [
      { href: "/byudzhet", label: "Бюджет", about: "Приходи, разходи, дълг" },
      { href: "/porachki", label: "Поръчки", about: "Договори, фирми, риск, връзки с политици" },
      { href: "/ikonomika", label: "Икономика", about: "Растеж, инфлация, заплати, жилища" },
      { href: "/ceni", label: "Цени", about: "Цените в магазините по вериги и места" },
    ],
  },
  {
    title: "Около мен",
    items: [{ href: "/mesta", label: "Места", about: "Вашата община: пари, поръчки, съвет" }],
  },
  {
    title: "Инструменти",
    items: [
      { href: "/statistiki", label: "Статистики", about: "Графики с източник за всичко" },
      { href: "/kalkulatori", label: "Калкулатори", about: "Заплата, кредит, лична инфлация" },
      { href: "/novini", label: "Новини", about: "Какво е ново в данните" },
      { href: "/rechnik", label: "Речник", about: "Какво значат термините" },
      { href: "/metodologiya", label: "Как работим", about: "Източници и правила" },
    ],
  },
];
const DESKTOP = groups.flatMap((g) => g.items.filter((i) => !["/metodologiya", "/rechnik", "/parlament/zakoni"].includes(i.href)).map((i) => ({ ...i, group: g.title })));
const isActive = (path: string, href: string) => path === href || path.startsWith(href + "/");

function SearchIcon() {
  return (
    <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="10.5" cy="10.5" r="6.5" /><path d="m20 20-4.8-4.8" />
    </svg>
  );
}

function Header({ path }: { path: string }) {
  // Менюто е отворено само за адреса, на който е отворено: при преход към друга страница се затваря само.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === path;
  const setOpen = (v: boolean | ((o: boolean) => boolean)) => setOpenAt((typeof v === "function" ? v(open) : v) ? path : null);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, [open]);

  return (
    <header className="bg-deep text-white border-b border-white/10 sticky top-0 z-40 lg:static">
      <div className="mx-auto max-w-[88rem] px-4 sm:px-6 flex items-center gap-x-8 h-14 lg:h-auto lg:py-4">
        <Link href="/" className="no-underline text-white hover:text-white flex items-center gap-2 shrink-0">
          <span aria-hidden className="inline-block w-3 h-3 bg-red" />
          <span className="text-[1.35rem] lg:text-[1.6rem] font-bold tracking-tight">Осъзнатост</span>
        </Link>

        {/* Компютър: всички раздели на един ред, с тънка граница между групите. */}
        <nav aria-label="Основно меню" className="hidden lg:flex items-center gap-x-5 text-[15px] flex-1">
          {DESKTOP.map((i, k) => (
            <span key={i.href} className="flex items-center gap-x-5">
              {k > 0 && DESKTOP[k - 1].group !== i.group && <span aria-hidden className="w-px h-4 bg-white/20" />}
              <Link href={i.href} title={i.about} aria-current={isActive(path, i.href) ? "page" : undefined}
                className={"no-underline pb-1 border-b-2 " + (isActive(path, i.href) ? "text-white border-red" : "text-white/75 border-transparent hover:text-white")}>
                {i.label}
              </Link>
            </span>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <Link href="/tarsene" aria-label="Търсене" className="no-underline text-white hover:text-white p-2 rounded hover:bg-white/10"><SearchIcon /></Link>
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mobile-menu"
            className="lg:hidden flex items-center gap-2 px-3 py-2 rounded bg-white/10 text-[15px] font-semibold">
            <span aria-hidden className="relative w-4 h-3">
              <span className={`absolute left-0 w-4 h-0.5 bg-white transition ${open ? "top-1.5 rotate-45" : "top-0"}`} />
              <span className={`absolute left-0 top-1.5 w-4 h-0.5 bg-white ${open ? "opacity-0" : ""}`} />
              <span className={`absolute left-0 w-4 h-0.5 bg-white transition ${open ? "top-1.5 -rotate-45" : "top-3"}`} />
            </span>
            {open ? "Затвори" : "Меню"}
          </button>
        </div>
      </div>

      {/* Телефон: менюто е групирано и всеки раздел казва с едно изречение какво има в него. */}
      {open && (
        <nav id="mobile-menu" aria-label="Основно меню" className="lg:hidden fixed inset-x-0 top-14 bottom-0 overflow-y-auto bg-deep border-t border-white/10 px-4 pb-10">
          <form action="/tarsene" className="flex gap-2 py-4">
            <input name="q" placeholder="Търси: фирма, закон, депутат, село…" className="flex-1 min-w-0 rounded px-3 py-2.5 text-ink bg-white text-[16px]" />
            <button className="px-4 rounded bg-red font-semibold">Търси</button>
          </form>
          {groups.map((g) => (
            <div key={g.title} className="mb-5">
              <p className="text-sm text-white/55 mb-1">{g.title}</p>
              <ul className="divide-y divide-white/10 border-y border-white/10">
                {g.items.map((i) => (
                  <li key={i.href}>
                    <Link href={i.href} aria-current={isActive(path, i.href) ? "page" : undefined}
                      className={"flex flex-col py-3 no-underline hover:text-white " + (isActive(path, i.href) ? "text-white border-l-2 border-red pl-3 -ml-px" : "text-white")}>
                      <span className="text-[17px] font-semibold">{i.label}</span>
                      <span className="text-sm text-white/65">{i.about}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      )}
    </header>
  );
}

function ActiveHeader() {
  return <Header path={usePathname()} />;
}

/** Активният раздел зависи от адреса; при страници, генерирани при заявка, той идва след първоначалния HTML. */
export function Nav() {
  return (
    <Suspense fallback={<Header path="" />}>
      <ActiveHeader />
    </Suspense>
  );
}
