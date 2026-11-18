"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// На телефона таблиците, които не се побират на екрана, стават карти: всеки ред е отделно каре,
// а всяка клетка получава името на колоната си (от заглавния ред). Таблиците, които се побират, остават таблици.
const MOBILE = 640;

function headers(t: HTMLTableElement): string[] {
  const row = t.tHead?.rows[t.tHead.rows.length - 1];
  if (!row) return [];
  const out: string[] = [];
  for (const th of Array.from(row.cells)) for (let i = 0; i < (th.colSpan || 1); i++) out.push(th.innerText.trim());
  return out;
}

function apply() {
  const small = window.innerWidth < MOBILE;
  for (const t of Array.from(document.querySelectorAll<HTMLTableElement>("main table:not([data-nostack])"))) {
    t.classList.remove("stacked");
    if (!small) continue;
    const box = t.parentElement?.clientWidth ?? window.innerWidth;
    if (t.scrollWidth <= box + 4) continue;
    const h = headers(t);
    for (const tr of Array.from(t.tBodies).flatMap((b) => Array.from(b.rows))) {
      let col = 0;
      for (const td of Array.from(tr.cells)) {
        if (h[col] && !td.hasAttribute("data-label")) td.setAttribute("data-label", h[col]);
        col += td.colSpan || 1;
      }
    }
    t.classList.add("stacked");
  }
}

export function ResponsiveTables() {
  const path = usePathname();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const later = () => { clearTimeout(timer); timer = setTimeout(apply, 80); };
    apply();
    const main = document.querySelector("main");
    const mo = new MutationObserver(later);
    if (main) mo.observe(main, { childList: true, subtree: true });
    window.addEventListener("resize", later);
    return () => { mo.disconnect(); window.removeEventListener("resize", later); clearTimeout(timer); };
  }, [path]);
  return null;
}
