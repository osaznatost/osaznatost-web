import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { MultiLine } from "@/components/Charts";
import { Anchor, SectionNav } from "@/components/SectionNav";
import { Page, Title } from "@/components/ui";
import { placeHref } from "@/lib/regions";

export const metadata = { title: "Цени в магазините" };

type Cat = { name: string; med: number; p25: number; p75: number; n: number; chains: Record<string, { med: number; min: number; n: number }>; oblasts: Record<string, number> };
type Latest = { date: string; source: string; chains: Record<string, number>; basket: number[]; cats: Record<string, Cat> };
type Hist = { dates: string[]; cats: Record<string, Record<string, number>> };
type Place = { name: string; oblast: string; muni: string; index: number; items: number };

const dir = path.join(process.cwd(), "data", "prices");
const read = <T,>(f: string): T | null => (existsSync(path.join(dir, f)) ? (JSON.parse(readFileSync(path.join(dir, f), "utf8")) as T) : null);
const eur = (v: number) => `${v.toLocaleString("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const pc = (v: number) => `${v > 0 ? "+" : ""}${v.toLocaleString("bg-BG", { maximumFractionDigits: 1 })}%`;
const dmy = (d: string) => d.split("-").reverse().join(".");

export default function Ceni() {
  const L = read<Latest>("latest.json");
  const H = read<Hist>("history.json");
  const P = read<Record<string, Place>>("places.json") ?? {};
  if (!L || !H) {
    return <Page><Title lead="Данните от портала „Колко струва“ се зареждат. Опитай отново по-късно.">Цени в магазините</Title></Page>;
  }
  const cats = Object.entries(L.cats).map(([id, c]) => ({ id: +id, ...c })).sort((a, b) => a.id - b.id);
  const first = H.dates[0];
  const change = (id: number) => { const h = H.cats[String(id)]; const a = h?.[first], b = h?.[L.date]; return a && b ? ((b / a) - 1) * 100 : null; };
  // Кошница: сбор на типичните цени на стоките от кошницата, по месеци.
  const basket = L.basket.filter((id) => L.cats[String(id)]);
  const months = [...new Set(H.dates.map((d) => d.slice(0, 7)))];
  const basketSeries = months.map((m) => {
    const ds = H.dates.filter((d) => d.startsWith(m));
    const vals = ds.map((d) => basket.reduce((s, id) => s + (H.cats[String(id)]?.[d] ?? NaN), 0)).filter((v) => !Number.isNaN(v));
    return vals.length ? { series: "Кошница", x: m, value: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 } : null;
  }).filter((x): x is { series: string; x: string; value: number } => !!x);
  const basketNow = basket.reduce((s, id) => s + L.cats[String(id)].med, 0);
  const basketFirst = basket.reduce((s, id) => s + (H.cats[String(id)]?.[first] ?? NaN), 0);
  // Вериги: средно отношение на типичната цена във веригата към типичната за страната, по стоките, които веригата продава.
  const chainIdx = Object.keys(L.chains).map((ch) => {
    const rel = cats.filter((c) => c.chains[ch]).map((c) => c.chains[ch].med / c.med);
    return { ch, stores: L.chains[ch], items: rel.length, idx: rel.length ? (rel.reduce((a, b) => a + b, 0) / rel.length - 1) * 100 : 0 };
  }).filter((x) => x.items >= 20 && x.stores >= 5).sort((a, b) => a.idx - b.idx);
  const oblastIdx = [...new Set(cats.flatMap((c) => Object.keys(c.oblasts)))].map((o) => {
    const rel = cats.filter((c) => L.basket.includes(c.id) && c.oblasts[o]).map((c) => c.oblasts[o] / c.med);
    return { o, items: rel.length, idx: rel.length ? (rel.reduce((a, b) => a + b, 0) / rel.length - 1) * 100 : 0 };
  }).filter((x) => x.items >= 10).sort((a, b) => a.idx - b.idx);
  const places = Object.entries(P).map(([ek, p]) => ({ ek, ...p })).sort((a, b) => a.index - b.index);
  const movers = cats.map((c) => ({ c, ch: change(c.id) })).filter((x) => x.ch !== null).sort((a, b) => (b.ch as number) - (a.ch as number));

  return (
    <Page>
      <Title lead={`Типичните цени на 85 стоки от голямата потребителска кошница във всички големи вериги, по данни, които търговците подават всеки ден на Комисията за защита на потребителите. Последни данни: ${dmy(L.date)}.`}>
        Цени в магазините
      </Title>
      <SectionNav items={[["koshnitsa", "Кошницата"], ["veregi", "Вериги"], ["oblasti", "Области"], ["mesta", "Населени места"], ["stoki", "Всички стоки"], ["kak", "Как смятаме"]]} />

      <Anchor id="koshnitsa" title="Кошницата" lead={`Сбор от типичните цени на ${basket.length} основни стоки (хляб, мляко, сирене, масло, пиле, кайма, яйца, боб, ориз, захар, брашно, олио, банани, ябълки, домати, лук, картофи и др.).`}>
        <div className="grid gap-3 sm:grid-cols-3 mb-6">
          <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">Кошницата сега</p><p className="display text-[2.4rem] leading-none mt-1">{eur(basketNow)}</p><p className="text-xs text-muted mt-1">към {dmy(L.date)}</p></div>
          <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">Промяна от {dmy(first)}</p><p className="display text-[2.4rem] leading-none mt-1">{Number.isNaN(basketFirst) ? "–" : pc((basketNow / basketFirst - 1) * 100)}</p><p className="text-xs text-muted mt-1">същите стоки, типични цени</p></div>
          <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">Обекти с данни</p><p className="display text-[2.4rem] leading-none mt-1">{Object.values(L.chains).reduce((a, b) => a + b, 0).toLocaleString("bg-BG")}</p><p className="text-xs text-muted mt-1">{Object.keys(L.chains).length} търговци</p></div>
        </div>
        {basketSeries.length > 1 && <div className="ring-1 ring-rule rounded-sm p-4 bg-white"><MultiLine data={basketSeries} unit=" €" height={260} /></div>}
        <div className="grid gap-6 md:grid-cols-2 mt-6">
          <div><p className="font-semibold mb-2">Най-много поскъпнали от {dmy(first)}</p>
            <ol className="text-[15px] space-y-1">{movers.slice(0, 8).map(({ c, ch }) => <li key={c.id} className="flex justify-between border-b border-rule py-1"><span>{c.name}</span><span className="num text-red">{pc(ch as number)}</span></li>)}</ol></div>
          <div><p className="font-semibold mb-2">Най-много поевтинели</p>
            <ol className="text-[15px] space-y-1">{movers.slice(-8).reverse().map(({ c, ch }) => <li key={c.id} className="flex justify-between border-b border-rule py-1"><span>{c.name}</span><span className="num text-green">{pc(ch as number)}</span></li>)}</ol></div>
        </div>
      </Anchor>

      <Anchor id="veregi" title="Кои вериги са по-евтини" lead="Средно с колко процента типичната цена във веригата е над или под типичната за страната, по стоките, които веригата продава (поне 20 от 85; само търговци с поне 5 обекта). Сравнението е грубо: веригите продават различни марки и разфасовки.">
        {(() => {
          const table = (rows: typeof chainIdx) => (
            <table className="w-full text-[15px] num">
              <thead><tr className="text-left border-b border-rule text-sm text-muted"><th className="py-2 pr-3 font-normal">Търговец</th><th className="text-right px-2 font-normal">Спрямо страната</th><th className="text-right px-2 font-normal">Обекти</th></tr></thead>
              <tbody>{rows.map((x) => <tr key={x.ch} className="border-b border-rule"><td className="py-1.5 pr-3">{x.ch}<span className="block sm:inline sm:ml-2 text-xs text-muted">{x.items} стоки</span></td><td className={`text-right px-2 font-semibold ${x.idx < 0 ? "text-green" : "text-red"}`}>{pc(x.idx)}</td><td className="text-right px-2">{x.stores.toLocaleString("bg-BG")}</td></tr>)}</tbody>
            </table>
          );
          const big = chainIdx.filter((x) => x.stores >= 20), small = chainIdx.filter((x) => x.stores < 20);
          return (
            <>
              <p className="text-sm font-semibold mb-1">Големите вериги (20+ обекта)</p>
              {table(big)}
              {small.length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer font-semibold text-green py-1">По-малки вериги и магазини ({small.length})</summary>
                  {table(small)}
                </details>
              )}
            </>
          );
        })()}
      </Anchor>

      <Anchor id="oblasti" title="По области" lead="С колко процента основните стоки от кошницата са средно по-скъпи или по-евтини в областта спрямо цялата страна.">
        <ol className="columns-2 lg:columns-3 gap-8 text-[15px] num">{oblastIdx.map((x) => <li key={x.o} className="flex justify-between gap-2 border-b border-rule py-1.5 break-inside-avoid"><span className="truncate">{x.o}</span><span className={`font-semibold ${x.idx < 0 ? "text-green" : "text-red"}`}>{pc(x.idx)}</span></li>)}</ol>
      </Anchor>

      <Anchor id="mesta" title="Най-евтини и най-скъпи населени места" lead="Само населени места с данни за поне 10 стоки от кошницата. Броят и видът на магазините влияят: където има само малки обекти, цените обикновено са по-високи.">
        <div className="grid gap-6 md:grid-cols-2">
          {[["Най-евтини", places.slice(0, 15)], ["Най-скъпи", places.slice(-15).reverse()]].map(([t, list]) => (
            <div key={t as string}><p className="font-semibold mb-2">{t as string}</p>
              <ol className="text-[15px] space-y-1">{(list as typeof places).map((p) => <li key={p.ek} className="flex justify-between border-b border-rule py-1"><span><Link href={placeHref.muni(p.muni)}>{p.name}</Link> <span className="text-sm text-muted">{p.oblast}</span></span><span className={`num ${p.index < 0 ? "text-green" : "text-red"}`}>{pc(p.index)}</span></li>)}</ol></div>
          ))}
        </div>
      </Anchor>

      <Anchor id="stoki" title="Всички стоки" lead="Типичната цена (медиана) на всички предложения в страната, обичайният диапазон (средната половина от цените) и най-евтините вериги. Натисни стока за подробности.">
        <ul className="divide-y divide-rule border-y border-rule">
          {cats.map((c) => { const ch = change(c.id); const chains = Object.entries(c.chains); return (
            <li key={c.id}><details>
              <summary className="cursor-pointer py-2 grid grid-cols-[1fr_auto_auto] gap-3 items-baseline text-[15px]"><span>{c.name}</span><span className="num font-semibold">{eur(c.med)}</span><span className={`num text-sm w-16 text-right ${ch === null ? "text-muted" : ch > 0 ? "text-red" : "text-green"}`}>{ch === null ? "–" : pc(ch)}</span></summary>
              <div className="pb-4 text-[15px] grid gap-4 md:grid-cols-2">
                <div><p className="text-sm text-muted mb-1">Обичайно между {eur(c.p25)} и {eur(c.p75)}; {c.n.toLocaleString("bg-BG")} предложения.</p>
                  <p className="font-semibold">Най-евтини вериги (типична цена)</p>
                  <ol className="space-y-0.5">{chains.slice(0, 6).map(([n, v]) => <li key={n} className="flex justify-between"><span>{n}</span><span className="num">{eur(v.med)}</span></li>)}</ol>
                  {chains.length > 6 && <><p className="font-semibold mt-2">Най-скъпи</p><ol className="space-y-0.5">{chains.slice(-3).reverse().map(([n, v]) => <li key={n} className="flex justify-between"><span>{n}</span><span className="num">{eur(v.med)}</span></li>)}</ol></>}
                </div>
                <div><p className="font-semibold">По области</p>
                  <ol className="space-y-0.5 columns-2 text-sm">{Object.entries(c.oblasts).sort((a, b) => a[1] - b[1]).map(([o, v]) => <li key={o} className="flex justify-between gap-2"><span>{o}</span><span className="num">{eur(v)}</span></li>)}</ol>
                </div>
              </div>
            </details></li>); })}
        </ul>
      </Anchor>

      <Anchor id="kak" title="Как смятаме">
        <ul className="list-disc pl-5 max-w-3xl text-[15px] space-y-1.5">
          <li>Източник: {L.source}. Търговците с годишен оборот над определения праг подават всеки ден цените си за 101 групи стоки; публикуват се като отворени данни на следващия ден.</li>
          <li>Във всяка група има различни марки и разфасовки. „Типична цена“ е медианата: половината от предложенията са по-евтини, половината по-скъпи. Затова сравненията между вериги и места показват общото ниво, а не цената на конкретен продукт.</li>
          <li>Използваме обикновената цена на дребно, без промоциите. Лекарствата (групи 86–101) не сравняваме, защото в една група има съвсем различни продукти.</li>
          <li>Как стоят цените у нас спрямо другите държави от ЕС (по видове храни и стоки): <Link href="/ikonomika/pokupatelna-sila">ценови равнища и покупателна сила (Евростат)</Link>. Горивата: <Link href="/proverki/goriva-2026">проверката „Горивата: виновно ли е правителството?“</Link>.</li>
          <li>Историята е по една дата на седмица от 5 януари 2026 г. (въвеждането на еврото), след това всеки ден.</li>
        </ul>
      </Anchor>
    </Page>
  );
}
