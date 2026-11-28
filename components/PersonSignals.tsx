// Всички сигнали за длъжностно лице на едно място, най-горе в профила; всеки ред води към раздела с подробностите.
import Link from "next/link";
import { data } from "@/lib/data";
import { localData } from "@/lib/local";
import { placeSuppliersAll, firmUrl } from "@/lib/procurement";
import { napDebtsMany } from "@/lib/napDebtors";
import { firmRe, firmsOf, propertyDeals, type TrLinks } from "@/lib/propertyDeals";

type H = { year: number; income: number; incomeSpouse: number; bankEur: number; receivableEur: number; debtEur: number };
const eur = (v: number) => `${Math.round(v).toLocaleString("bg-BG")} €`;
const key = (n: string) => { const w = n.toUpperCase().replace(/[^А-ЯЁA-Z\s-]/g, "").split(/\s+/).filter(Boolean); return `${w[0]} ${w.at(-1)}`; };

export async function PersonSignals({ code, slug, name, history }: { code: string; slug: string; name: string; history: H[] }) {
  const [links, sups, L, deals] = await Promise.all([
    data<TrLinks>(`tr-links/${code}.json`).catch(() => null),
    placeSuppliersAll(code).catch(() => []),
    localData(code).catch(() => null),
    propertyDeals(code, undefined, slug).catch(() => []),
  ]);
  const firms = links ? firmsOf(links, slug) : [];
  const items: { level: "high" | "mid"; href: string; text: React.ReactNode }[] = [];

  // Свързани фирми, които печелят поръчки в общината
  const bySup = new Map(sups.map((s) => [s.eik.slice(0, 9), s]));
  const win = [...new Map(firms.filter((f) => bySup.has(f.eik.slice(0, 9))).map((f) => [f.eik.slice(0, 9), f])).values()];
  if (win.length) {
    const sum = win.reduce((s, f) => s + (bySup.get(f.eik.slice(0, 9))!.total_eur ?? 0), 0);
    items.push({ level: win.some((f) => !f.via) || sum >= 50000 ? "high" : "mid", href: "#svarzani", text: <>{win.length} свързан{win.length > 1 ? "и фирми печелят" : "а фирма печели"} поръчки в общината за {eur(sum)}: {win.slice(0, 3).map((f, i) => <span key={f.eik}>{i ? ", " : ""}<Link href={firmUrl(f.eik)}>{f.name}</Link>{f.via ? ` (през ${f.via})` : " (негова/нейна)"}</span>)}{win.length > 3 ? "…" : ""}</> });
  }
  // Свързани фирми — длъжници към НАП
  const debts = await napDebtsMany(firms.map((f) => f.eik)).catch(() => new Map());
  if (debts.size) items.push({ level: "mid", href: "#svarzani", text: <>{debts.size} свързан{debts.size > 1 ? "и фирми са длъжници" : "а фирма е длъжник"} към държавата (НАП): {[...debts.entries()].slice(0, 3).map(([e, d], i) => <span key={e}>{i ? ", " : ""}<Link href={firmUrl(e)}>{d.name}</Link> ({eur(d.eur)})</span>)}</> });
  // Общинско имущество към свързана фирма
  if (deals.length) items.push({ level: "high", href: "#imushtestvo", text: <>{deals.length} решени{deals.length > 1 ? "я" : "е"} на общинския съвет за общинско имущество в полза на свързана фирма: {deals.slice(0, 2).map((d, i) => <span key={d.number}>{i ? ", " : ""}<Link href={firmUrl(d.firm.eik)}>{d.firm.name}</Link></span>)}</> });
  // Гласувал(а) „за“ решение, в което се споменава свързана фирма
  const me = key(name);
  const res = firms.map((f) => ({ f, re: firmRe(f.name) })).filter((x) => x.re);
  const conflict = res.length ? (L?.resolutions ?? []).filter((r) => r.votes?.some(([n, v]) => key(n) === me && v === "for")).map((r) => ({ r, hit: res.find((x) => x.re!.test(`${r.title} ${r.text ?? ""}`.toUpperCase())) })).filter((x) => x.hit) : [];
  if (conflict.length) items.push({ level: "high", href: "#glasuvane", text: <>Гласувал(а) „за“ {conflict.length} решени{conflict.length > 1 ? "я" : "е"}, в които се споменава свързана фирма: {conflict.slice(0, 2).map(({ r, hit }, i) => <span key={r.number}>{i ? "; " : ""}№ {r.number} ({hit!.f.name})</span>)}</> });
  // Имуществото расте повече от доходите
  for (let i = 1; i < history.length; i++) {
    const w = (h: H) => h.bankEur + h.receivableEur - h.debtEur;
    const d = w(history[i]) - w(history[i - 1]), inc = history[i].income + history[i].incomeSpouse;
    if (d >= 50000 && d > 2 * Math.max(inc, 1)) { items.push({ level: d >= 150000 ? "high" : "mid", href: "#imushtestvo-godini", text: <>Парите в банки (минус задълженията) растат с {eur(d)} за година ({history[i - 1].year}→{history[i].year}), а доходът за годината е {eur(inc)}</> }); break; }
  }
  if (!items.length) return null;
  const nh = items.filter((i) => i.level === "high").length;
  return (
    <section className="ring-2 ring-red rounded-sm p-4 sm:p-5 mb-8 bg-white max-w-4xl text-[15px]">
      <p className="text-sm font-semibold text-red">Сигнали за риск · {name}</p>
      <p className="display text-[1.6rem] leading-tight mb-2">{items.length} сигнал{items.length > 1 ? "а" : ""}{nh ? `, ${nh} сериозн${nh > 1 ? "и" : "о"}` : ""}</p>
      <ul className="space-y-1.5">{[...items.filter((i) => i.level === "high"), ...items.filter((i) => i.level !== "high")].map((i, k) => (
        <li key={k} className={`border-l-4 pl-3 ${i.level === "high" ? "border-red" : "border-[#e08a2e]"}`}>{i.text} · <a href={i.href}>подробно</a></li>
      ))}</ul>
      <p className="text-xs text-muted mt-2">Връзките са по Търговския регистър (с историята), по три имена, без ЕГН. Сигнал е повод за въпрос, не доказателство за нарушение.</p>
    </section>
  );
}
