import { data } from "@/lib/data";
import Link from "next/link";
import { Anchor, SectionNav } from "@/components/SectionNav";
import { Page, Title } from "@/components/ui";
import IDENT from "@/content/identical-products.json";
import { DmCompare } from "@/components/DmCompare";

export const metadata = { title: "Надценки и цени спрямо чужбина" };

type Ident = { id: string; label: string; size: string; group: string; bg: { chain: string; name: string }; at: { search: string; sku: string } };
type Prod = { date: string; items: Record<string, { med: number; min: number; max: number; stores: number; chains?: Record<string, { med: number; stores: number }> }> };
type Offer = { name: string; price: number; promo: boolean; url: string };
type Abroad = { date: string; chain: string; items: Record<string, Offer>; ro?: { date: string; ron: number; chains: Record<string, Record<string, Offer & { lei: number }>> } };
type Whole = { week: string; source: string; url: string; items: Record<string, { eur: number; unit: string }> };
type Cat = { name: string; med: number; n: number; chains: Record<string, { med: number; min: number; n: number }> };
type Latest = { date: string; chains: Record<string, number>; cats: Record<string, Cat> };
type EU = { year: string; food: Record<string, number>; aic: Record<string, number>; aicYear: string | null };

const read = <T,>(f: string): Promise<T | null> => data<T>(`prices/${f}`);
const eur = (v: number) => `${v.toLocaleString("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const pc = (v: number) => `${v > 0 ? "+" : ""}${Math.round(v).toLocaleString("bg-BG")}%`;
const dmy = (d: string) => d.split("-").reverse().join(".");

/** Цена на едро (ДКСБТ) ↔ група стоки на КЗП със същата единица (кг, литър или същата разфасовка). */
const WHOLE_MAP: [RegExp, number, string][] = [
  [/^Захар$/, 38, "Захар, 1 кг"], [/^Брашно тип"?500"?$/, 40, "Брашно тип 500, 1 кг"], [/^Ориз$/, 35, "Ориз, 1 кг"], [/^Фасул зрял$/, 33, "Боб, 1 кг"], [/^Леща$/, 34, "Леща, 1 кг"],
  [/^Слънчогледово олио/, 42, "Олио, 1 л"], [/^Прясно мляко кут\.?\/бут\. 1л 3%$/, 6, "Прясно мляко 3%, 1 л"], [/^Кисело мляко коф\.\s?0\.400кг 3% и над 3%$/, 7, "Кисело мляко, 400 г"],
  [/^Бяло саламурено сирене от кр\. мляко$/, 8, "Бяло сирене, 1 кг (насипно)"], [/^Кашкавал - Витоша$/, 10, "Кашкавал, 1 кг (насипен)"], [/^Пилешки бут цял$/, 17, "Пилешки бут, 1 кг"], [/^Кайма смес$/, 25, "Кайма, 1 кг"],
  [/^Ябълки$/, 53, "Ябълки, 1 кг"], [/^Банани$/, 52, "Банани, 1 кг"], [/^Лимони$/, 50, "Лимони, 1 кг"], [/^Портокали$/, 51, "Портокали, 1 кг"], [/^Домати оранжерийни$/, 54, "Домати, 1 кг"], [/^Краставици оранжерийни$/, 58, "Краставици, 1 кг"],
  [/^Картофи$/, 61, "Картофи, 1 кг"], [/^Зеле главесто$/, 57, "Зеле, 1 кг"], [/^Моркови$/, 56, "Моркови, 1 кг"], [/^Лук кромид зрял$/, 55, "Кромид лук, 1 кг"], [/^Чесън зрял$/, 59, "Чесън, 1 кг"],
];
const CHAINS = ["Лидл България", "Кауфланд България", "Билла", "ФАНТАСТИКО", "T Market"];
const NAMES: Record<string, string> = { BG: "България", RO: "Румъния", EL: "Гърция", HR: "Хърватия", PL: "Полша", HU: "Унгария", CZ: "Чехия", SK: "Словакия", SI: "Словения", AT: "Австрия", DE: "Германия", FR: "Франция", IT: "Италия", ES: "Испания", PT: "Португалия", NL: "Нидерландия", BE: "Белгия", LU: "Люксембург", IE: "Ирландия", DK: "Дания", SE: "Швеция", FI: "Финландия", EE: "Естония", LV: "Латвия", LT: "Литва", CY: "Кипър", MT: "Малта" };

export default async function Nadcenki() {
  const ident = IDENT.items as Ident[];
  const [P, A, W, L, E] = await Promise.all([read<Prod>("products.json"), read<Abroad>("abroad.json"), read<Whole>("wholesale.json"), read<Latest>("latest.json"), read<EU>("eu-levels.json")]);

  // Чужбина: BILLA Австрия и веригите в Румъния. Ред има, ако продуктът е намерен у нас и поне в една чужда верига.
  const ROCH = ["Auchan", "Carrefour"].filter((c) => Object.keys(A?.ro?.chains[c] ?? {}).length);
  const rows = ident.map((i) => {
    const bg = P?.items[i.id], at = A?.items[i.id];
    const ro = Object.fromEntries(ROCH.flatMap((c) => { const o = A?.ro?.chains[c]?.[i.id]; return o ? [[c, o]] : []; })) as Record<string, Offer & { lei: number }>;
    return { i, bg, at, ro };
  }).filter((r) => r.bg && (r.at || Object.keys(r.ro).length));
  const BGCH: [string, string][] = [["Билла", "BILLA"], ["Кауфланд България", "Kaufland"], ["Лидл България", "Lidl"], ["ФАНТАСТИКО", "Фантастико"], ["T Market", "T Market"]];
  const bgCh = BGCH.filter(([c]) => rows.some((r) => r.bg!.chains?.[c]));
  const cheapestBg = (r: (typeof rows)[number]) => Math.min(...Object.values(r.bg!.chains ?? {}).map((x) => x.med), r.bg!.med);
  const cheapestRo = (r: (typeof rows)[number]) => { const v = Object.values(r.ro).map((o) => o.price); return v.length ? Math.min(...v) : null; };
  // Сравнение „най-евтиното у нас срещу най-евтиното в държавата“ върху продуктите, които ги има и на двете места.
  const vs = (get: (r: (typeof rows)[number]) => number | null) => {
    const rs = rows.filter((r) => get(r) != null);
    const bg = rs.reduce((s, r) => s + cheapestBg(r), 0), ab = rs.reduce((s, r) => s + get(r)!, 0);
    return { n: rs.length, bg, ab, diff: ab ? (bg / ab - 1) * 100 : 0, dearer: rs.filter((r) => cheapestBg(r) / get(r)! > 1.01).length };
  };
  const vsRo = vs(cheapestRo), vsAt = vs((r) => r.at?.price ?? null);
  const billa = rows.filter((r) => r.at);
  const sumBg = billa.reduce((s, r) => s + r.bg!.med, 0), sumAt = billa.reduce((s, r) => s + r.at!.price, 0);
  const hyg = billa.filter((r) => r.i.group === "Хигиена");
  const rel = (a: number, b: number | null) => (b == null ? null : (a / b - 1) * 100);
  const Diff = ({ v, label }: { v: number | null; label: string }) => <td data-label={label} className={`text-right px-2 font-semibold ${v == null ? "" : v > 1 ? "text-red" : v < -1 ? "text-green" : ""}`}>{v == null ? <span className="text-muted font-normal">–</span> : pc(v)}</td>;
  const Price = ({ o, low, label }: { o?: Offer & { lei?: number }; low?: boolean; label: string }) => <td data-label={label} className={`text-right px-2 ${low ? "font-semibold text-green" : ""}`}>{o ? <><a href={o.url} rel="nofollow noopener">{eur(o.price)}</a>{o.promo && <span className="block text-xs text-muted">промоция</span>}</> : <span className="text-muted">–</span>}</td>;

  const whole = W && L ? Object.entries(W.items).flatMap(([name, w]) => {
    const m = WHOLE_MAP.find(([re]) => re.test(name));
    const c = m && L.cats[String(m[1])];
    if (!m || !c) return [];
    const chains = Object.fromEntries(CHAINS.map((ch) => [ch, c.chains[ch]?.med ?? null]));
    return [{ name, label: m[2], w: w.eur, all: c.med, chains }];
  }) : [];
  const ratio = (v: number | null, w: number) => (v == null ? null : (v / w - 1) * 100);
  const chainCols = CHAINS.filter((ch) => whole.some((x) => x.chains[ch] != null));
  const odd = (r: number) => r < -40 || r > 120; // твърде далеч от цената на едро: най-често различна разфасовка в данните на веригата

  const eu = E ? Object.keys(NAMES).filter((c) => E.food[c] && E.aic[c]).map((c) => ({ c, food: E.food[c], aic: E.aic[c], burden: (E.food[c] / E.aic[c]) * 100 })).sort((a, b) => b.burden - a.burden) : [];
  const bgEu = eu.find((x) => x.c === "BG");

  return (
    <Page>
      <Title lead="Три сравнения, изчислени по един и същ начин за всички: еднакви продукти във веригите в България, Румъния и Австрия; цената на едро срещу цената в магазина; и колко струва храната у нас спрямо доходите в ЕС. Под всяка цифра стои какво точно сравняваме.">
        Надценки и цени спрямо чужбина
      </Title>
      <SectionNav items={[["dm", "dm в 5 държави"], ["ednakvi", "Вериги: България, Румъния, Австрия"], ["edro", "Едро → дребно"], ["evropa", "България в ЕС"], ["metodologiya", "Методология"]]} />

      <Anchor id="dm" title="Един и същ продукт в 5 държави (dm)" lead="Хиляди еднакви продукти (козметика, хигиена, бебешки и домашни стоки, храни) с един и същ баркод в dm България, Германия, Австрия, Румъния и Хърватия. Показваме колко по-скъпо или по-евтино е у нас.">
        <DmCompare />
      </Anchor>

      <Anchor id="ednakvi" title="Един и същ продукт във веригите у нас, в Румъния и в Австрия" lead={`Еднакви артикули (марка, вид и разфасовка) по държави и по вериги. България: BILLA, Kaufland, Lidl, Фантастико и T Market, обичайната цена в магазините по данните на КЗП${P ? ` (${dmy(P.date)})` : ""}. Румъния: онлайн магазините на Auchan и Carrefour${A?.ro ? ` (${dmy(A.ro.date)}, леи по курса на ЕЦБ ${A.ro.ron.toLocaleString("bg-BG")} за 1 €)` : ""}. Австрия: онлайн магазинът на BILLA${A ? ` (${dmy(A.date)})` : ""}. Празно поле: веригата не продава точно този артикул или в момента го няма.`}>
        {rows.length === 0 ? <p className="text-muted">Данните се събират. Опитай отново по-късно.</p> : (
          <>
            <div className="grid gap-3 sm:grid-cols-3 mb-5">
              {vsRo.n > 0 && <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">България спрямо Румъния</p><p className="display text-[2.4rem] leading-none mt-1">{pc(vsRo.diff)}</p><p className="text-xs text-muted mt-1">{vsRo.n} продукта, всеки от най-евтината верига: {eur(vsRo.bg)} у нас срещу {eur(vsRo.ab)} в Румъния. По-скъпи у нас: {vsRo.dearer} от {vsRo.n}.</p></div>}
              {vsAt.n > 0 && <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">България спрямо Австрия</p><p className="display text-[2.4rem] leading-none mt-1">{pc(vsAt.diff)}</p><p className="text-xs text-muted mt-1">{vsAt.n} продукта, най-евтината верига у нас: {eur(vsAt.bg)} срещу {eur(vsAt.ab)} в BILLA Австрия. По-скъпи у нас: {vsAt.dearer} от {vsAt.n}.</p></div>}
              {billa.length > 0 && <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">Една и съща верига: BILLA</p><p className="display text-[2.4rem] leading-none mt-1">{pc((sumBg / sumAt - 1) * 100)}</p><p className="text-xs text-muted mt-1">{eur(sumBg)} в BILLA у нас срещу {eur(sumAt)} в BILLA Австрия, за {billa.length} продукта.</p></div>}
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-[15px] num min-w-[900px]">
              <thead>
                <tr className="text-sm"><th></th><th colSpan={bgCh.length} className="text-center px-2 pb-1 font-semibold border-b border-rule">България</th>{ROCH.length > 0 && <th colSpan={ROCH.length} className="text-center px-2 pb-1 font-semibold border-b border-rule">Румъния</th>}<th className="text-center px-2 pb-1 font-semibold border-b border-rule">Австрия</th><th colSpan={ROCH.length ? 2 : 1} className="text-center px-2 pb-1 font-semibold border-b border-rule">Най-евтино у нас спрямо</th></tr>
                <tr className="text-left border-b border-rule text-sm text-muted"><th className="py-2 pr-3 font-normal">Продукт</th>{bgCh.map(([c, n]) => <th key={c} className="text-right px-2 font-normal">{n}</th>)}{ROCH.map((c) => <th key={c} className="text-right px-2 font-normal">{c}</th>)}<th className="text-right px-2 font-normal">BILLA</th>{ROCH.length > 0 && <th className="text-right px-2 font-normal">Румъния</th>}<th className="text-right px-2 font-normal">Австрия</th></tr>
              </thead>
              <tbody>{["Основни храни", "Кафе", "Хигиена", "Други"].flatMap((g) => {
                const rs = rows.filter((r) => r.i.group === g);
                const cols = 1 + bgCh.length + ROCH.length + 1 + (ROCH.length ? 2 : 1);
                return rs.length ? [<tr key={g}><td colSpan={cols} className="pt-4 pb-1 text-sm font-semibold">{g}</td></tr>, ...rs.map((r) => {
                  const lowBg = cheapestBg(r), lowRo = cheapestRo(r);
                  return (
                  <tr key={r.i.id} className="border-b border-rule">
                    <td className="py-1.5 pr-3">{r.i.label}<span className="text-sm text-muted">, {r.i.size}</span></td>
                    {bgCh.map(([c]) => { const v = c === "Билла" ? r.bg!.med : r.bg!.chains?.[c]?.med; const low = v != null && v === lowBg && Object.keys(r.bg!.chains ?? {}).length > 1; return <td key={c} data-label={`${BGCH.find(([x]) => x === c)![1]} · България`} className={`text-right px-2 ${low ? "font-semibold text-green" : ""}`}>{v != null ? eur(v) : <span className="text-muted">–</span>}</td>; })}
                    {ROCH.map((c) => <Price key={c} label={`${c} · Румъния`} o={r.ro[c]} low={Object.keys(r.ro).length > 1 && r.ro[c]?.price === lowRo} />)}
                    <Price label="BILLA · Австрия" o={r.at} />
                    {ROCH.length > 0 && <Diff label="Най-евтино у нас спрямо Румъния" v={rel(lowBg, lowRo)} />}
                    <Diff label="Най-евтино у нас спрямо Австрия" v={rel(lowBg, r.at?.price ?? null)} />
                  </tr>); })] : [];
              })}</tbody>
            </table>
            </div>
            <p className="text-sm text-muted mt-3 max-w-3xl">Зелено: най-евтината верига в държавата за този продукт. Последните колони: с колко процента най-евтината цена у нас е над (+) или под (−) най-евтината цена в Румъния и цената в Австрия. Цените са крайни, с ДДС, в евро. ДДС върху храните: България 20%, Румъния 11%, Австрия 10% (за някои основни 4,9%), затова при храните част от разликата е данъкът. При пастите за зъби ДДС е 20% у нас, 21% в Румъния и 20% в Австрия{hyg.length ? ` — там сравнението е най-чисто: в BILLA ${hyg.filter((r) => r.bg!.med / r.at!.price > 1.01).length} от ${hyg.length} са по-скъпи у нас` : ""}. Цените в Румъния и Австрия са от онлайн магазините и може да включват промоция (отбелязано е).</p>
          </>
        )}
      </Anchor>

      <Anchor id="edro" title="Цена на едро и цена в магазина" lead={`Средната цена на едро от бюлетина на ДКСБТ${W ? ` (седмицата до ${dmy(W.week)})` : ""} срещу обичайната цена в магазините (данни на КЗП). Разликата не е „чиста печалба“: в нея са транспортът, складът, наемът, заплатите, фирата и данъците.`}>
        {whole.length === 0 ? <p className="text-muted">Данните се събират. Опитай отново по-късно.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-[15px] num min-w-[640px]">
              <thead><tr className="text-left border-b border-rule text-sm text-muted"><th className="py-2 pr-3 font-normal">Стока</th><th className="text-right px-2 font-normal">На едро</th><th className="text-right px-2 font-normal">Всички магазини</th>{chainCols.map((ch) => <th key={ch} className="text-right px-2 font-normal">{ch.replace(" България", "")}</th>)}</tr></thead>
              <tbody>{whole.map((x) => (
                <tr key={x.name} className="border-b border-rule">
                  <td className="py-1.5 pr-3">{x.label}</td>
                  <td className="text-right px-2">{eur(x.w)}</td>
                  <td className="text-right px-2"><span className="font-semibold">{pc(ratio(x.all, x.w)!)}</span><span className="block text-xs text-muted">{eur(x.all)}</span></td>
                  {chainCols.map((ch) => { const r = ratio(x.chains[ch], x.w); return <td key={ch} className="text-right px-2">{r == null ? <span className="text-muted">–</span> : <><span className={odd(r) ? "text-muted" : ""}>{pc(r)}{odd(r) && "*"}</span><span className="block text-xs text-muted">{eur(x.chains[ch]!)}</span></>}</td>; })}
                </tr>))}</tbody>
            </table>
          </div>
        )}
        <p className="text-sm text-muted mt-3 max-w-3xl">Процентът показва с колко обичайната цена на дребно е над средната цена на едро. Отрицателно число значи, че в магазина стоката се продава под средната цена на едро (например по-евтина марка или голям договор с доставчик). Със звездичка (*) са разлики под −40% или над +120%: най-често веригата е подала в групата „за 1 кг“ цена на пакет с друго тегло, затова тези стойности не са сигурни. Сравняваме само стоки, при които единицата е една и съща (килограм, литър или същата разфасовка). За плодовете и зеленчуците взимаме цената на едро на българската продукция (ДКСБТ дава вноса отделно).</p>
      </Anchor>

      <Anchor id="evropa" title="Храната в България спрямо ЕС" lead={E ? `Евростат, ${E.year} г.: ценово равнище на храните и безалкохолните напитки и реално потребление на човек (стандарт на покупателна способност), и двете спрямо средното за ЕС = 100.` : undefined}>
        {!bgEu ? <p className="text-muted">Данните се събират.</p> : (
          <>
            <p className="max-w-3xl text-[15px] mb-4">В България храната струва <b>{Math.round(bgEu.food)}%</b> от средната цена в ЕС, а потреблението на човек е <b>{Math.round(bgEu.aic)}%</b> от средното. Затова спрямо доходите храната тежи {bgEu.burden >= 100 ? <>с около <b>{Math.round(bgEu.burden - 100)}%</b> повече</> : <>с около <b>{Math.round(100 - bgEu.burden)}%</b> по-малко</>} от средното за ЕС. Това е показател за тежестта на цените, а не за надценките на търговците.</p>
            <ol className="columns-1 sm:columns-2 gap-8 text-[15px] num">{eu.map((x) => (
              <li key={x.c} className={`flex justify-between gap-2 border-b border-rule py-1.5 break-inside-avoid ${x.c === "BG" ? "font-semibold" : ""}`}>
                <span>{NAMES[x.c]}</span><span><span className="text-sm text-muted mr-2">цени {Math.round(x.food)} · потребление {Math.round(x.aic)}</span><span className={x.burden > 100 ? "text-red" : "text-green"}>{pc(x.burden - 100)}</span></span>
              </li>))}</ol>
            <p className="text-sm text-muted mt-3">Подредено по това колко тежи храната спрямо потреблението: ценово равнище на храните ÷ реално потребление на човек. Повече за ценовите равнища по видове стоки: <Link href="/ikonomika/pokupatelna-sila">покупателна сила</Link>.</p>
          </>
        )}
      </Anchor>

      <Anchor id="metodologiya" title="Методология и ограничения">
        <ul className="list-disc pl-5 max-w-3xl text-[15px] space-y-1.5">
          <li><b>Това не са надценките на търговците.</b> Истинската надценка е разликата между доставната цена на веригата и цената на рафта. Доставните цени не са публични. Показваме разлики спрямо публични цени, които всеки може да провери.</li>
          <li><b>Еднакви продукти.</b> Сравняваме само артикули със същата марка, вид и разфасовка: във веригите у нас, в Auchan и Carrefour в Румъния (по баркод и номер на артикула) и в BILLA Австрия. Списъкът е тук: <a href="https://github.com/osaznatost/osaznatost-web/blob/main/content/identical-products.json">content/identical-products.json</a>. Основни храни като хляб, мляко и яйца у нас и в чужбина са от различни местни производители, затова не са в това сравнение; за тях служат цените на едро и данните на Евростат.</li>
          <li><b>Цените в България</b> са обичайната (непромоционална) цена, която веригата подава всеки ден на КЗП за всеки свой магазин; показваме медианата по магазините. <b>Цените в Румъния и Австрия</b> са от онлайн магазините на Auchan, Carrefour и BILLA (леите са превърнати в евро по курса на ЕЦБ); ако там артикулът е в промоция, това е отбелязано. Онлайн цената може да се различава от цената в отделен магазин.</li>
          <li><b>ДДС.</b> Всички цени са с ДДС. В България ставката за храните е 20%; в Австрия от 1 юли 2026 г. е 4,9% за определени основни храни и 10% за повечето други, а за козметиката и хигиената е 20%. В Румъния от 1 август 2025 г. ДДС за храните е 11%, а за останалото 21%.</li>
          <li><b>Доходи.</b> Една и съща цена тежи различно: средната заплата в Австрия е няколко пъти по-висока, а в Румъния също е по-висока от нашата. Затова даваме и сравнението на Евростат, което отчита и цените, и потреблението.</li>
          <li><b>Цени на едро.</b> Средните цени, които ДКСБТ събира от стоковите тържища и пазари; не отразяват договорите на големите вериги директно с производители. Показваме ги както ги публикува комисията.</li>
          <li><b>Без заключения за отделни фирми.</b> Високата разлика е повод за въпрос (към веригата, КЗП или КЗК), не доказателство за нарушение. От 9 август 2026 г. до 9 август 2027 г. законът забранява икономически неоправдано повишаване на цените; проверките са на КЗП.</li>
          <li>Обновяване: цените в България всеки ден, в Румъния, Австрия и на едро всяка седмица, Евростат веднъж годишно.</li>
        </ul>
      </Anchor>
    </Page>
  );
}
