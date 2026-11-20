import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { Anchor, SectionNav } from "@/components/SectionNav";
import { Page, Title } from "@/components/ui";
import IDENT from "@/content/identical-products.json";

export const metadata = { title: "Надценки и цени спрямо чужбина" };

type Ident = { id: string; label: string; size: string; group: string; bg: { chain: string; name: string }; at: { search: string; sku: string } };
type Prod = { date: string; items: Record<string, { med: number; min: number; max: number; stores: number }> };
type Abroad = { date: string; chain: string; items: Record<string, { name: string; price: number; promo: boolean; url: string }> };
type Whole = { week: string; source: string; url: string; items: Record<string, { eur: number; unit: string }> };
type Cat = { name: string; med: number; n: number; chains: Record<string, { med: number; min: number; n: number }> };
type Latest = { date: string; chains: Record<string, number>; cats: Record<string, Cat> };
type EU = { year: string; food: Record<string, number>; aic: Record<string, number>; aicYear: string | null };

const dir = path.join(process.cwd(), "data", "prices");
const read = <T,>(f: string): T | null => (existsSync(path.join(dir, f)) ? (JSON.parse(readFileSync(path.join(dir, f), "utf8")) as T) : null);
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

export default function Nadcenki() {
  const ident = IDENT.items as Ident[];
  const P = read<Prod>("products.json");
  const A = read<Abroad>("abroad.json");
  const W = read<Whole>("wholesale.json");
  const L = read<Latest>("latest.json");
  const E = read<EU>("eu-levels.json");

  const rows = ident.map((i) => ({ i, bg: P?.items[i.id], at: A?.items[i.id] })).filter((r) => r.bg && r.at)
    .map((r) => ({ ...r, diff: (r.bg!.med / r.at!.price - 1) * 100 }));
  const dearer = rows.filter((r) => r.diff > 1).length, cheaper = rows.filter((r) => r.diff < -1).length;
  const sumBg = rows.reduce((s, r) => s + r.bg!.med, 0), sumAt = rows.reduce((s, r) => s + r.at!.price, 0);
  const hyg = rows.filter((r) => r.i.group === "Хигиена");

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
      <Title lead="Три сравнения, изчислени по един и същ начин за всички: еднакви продукти в една и съща верига в България и в Австрия; цената на едро срещу цената в магазина; и колко струва храната у нас спрямо доходите в ЕС. Под всяка цифра стои какво точно сравняваме.">
        Надценки и цени спрямо чужбина
      </Title>
      <SectionNav items={[["ednakvi", "Еднакви продукти"], ["edro", "Едро → дребно"], ["evropa", "България в ЕС"], ["metodologiya", "Методология"]]} />

      <Anchor id="ednakvi" title="Един и същ продукт, една и съща верига" lead={`Еднакви артикули (марка, вид и разфасовка) в BILLA България и BILLA Австрия. В България: обичайната цена в магазините на веригата${P ? ` (${dmy(P.date)})` : ""}; в Австрия: онлайн магазинът на BILLA${A ? ` (${dmy(A.date)})` : ""}.`}>
        {rows.length === 0 ? <p className="text-muted">Данните се събират. Опитай отново по-късно.</p> : (
          <>
            <div className="grid gap-3 sm:grid-cols-3 mb-5">
              <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">По-скъпо в България</p><p className="display text-[2.4rem] leading-none mt-1">{dearer} от {rows.length}</p><p className="text-xs text-muted mt-1">с повече от 1%</p></div>
              <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">По-евтино в България</p><p className="display text-[2.4rem] leading-none mt-1">{cheaper} от {rows.length}</p><p className="text-xs text-muted mt-1">с повече от 1%</p></div>
              <div className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">Цялата кошница</p><p className="display text-[2.4rem] leading-none mt-1">{pc((sumBg / sumAt - 1) * 100)}</p><p className="text-xs text-muted mt-1">{eur(sumBg)} у нас срещу {eur(sumAt)} в Австрия</p></div>
            </div>
            <table className="w-full text-[15px] num">
              <thead><tr className="text-left border-b border-rule text-sm text-muted"><th className="py-2 pr-3 font-normal">Продукт</th><th className="text-right px-2 font-normal">BILLA BG</th><th className="text-right px-2 font-normal">BILLA AT</th><th className="text-right px-2 font-normal">Разлика</th></tr></thead>
              <tbody>{["Основни храни", "Кафе", "Хигиена", "Други"].flatMap((g) => {
                const rs = rows.filter((r) => r.i.group === g);
                return rs.length ? [<tr key={g}><td colSpan={4} className="pt-4 pb-1 text-sm font-semibold">{g}</td></tr>, ...rs.map((r) => (
                  <tr key={r.i.id} className="border-b border-rule">
                    <td className="py-1.5 pr-3">{r.i.label}<span className="text-sm text-muted">, {r.i.size}</span></td>
                    <td className="text-right px-2">{eur(r.bg!.med)}</td>
                    <td className="text-right px-2"><a href={r.at!.url} rel="nofollow noopener">{eur(r.at!.price)}</a>{r.at!.promo && <span className="block text-xs text-muted">промоция</span>}</td>
                    <td className={`text-right px-2 font-semibold ${r.diff > 1 ? "text-red" : r.diff < -1 ? "text-green" : ""}`}>{pc(r.diff)}</td>
                  </tr>))] : [];
              })}</tbody>
            </table>
            <p className="text-sm text-muted mt-3 max-w-3xl">„Разлика“: с колко процента цената в България е над (+) или под (−) цената в Австрия. Цените са крайни, с ДДС. В България ДДС върху храните е 20%, в Австрия 10% за повечето храни и 4,9% за някои основни, затова при храните част от разликата е данъкът. При пастите за зъби ДДС и в двете държави е 20%{hyg.length ? ` — там сравнението е най-чисто: ${hyg.filter((r) => r.diff > 1).length} от ${hyg.length} са по-скъпи у нас` : ""}.</p>
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
          <li><b>Еднакви продукти.</b> Сравняваме само артикули със същата марка, вид и разфасовка, в една и съща верига (BILLA). Списъкът е тук: <a href="https://github.com/osaznatost/osaznatost-web/blob/main/content/identical-products.json">content/identical-products.json</a>. Основни храни като хляб, мляко и яйца у нас и в Австрия са от различни местни производители, затова не са в това сравнение; за тях служат цените на едро и данните на Евростат.</li>
          <li><b>Цените в България</b> са обичайната (непромоционална) цена, която веригата подава всеки ден на КЗП за всеки свой магазин; показваме медианата по магазините. <b>Цените в Австрия</b> са от онлайн магазина на BILLA Австрия; ако там артикулът е в промоция, това е отбелязано. Онлайн цената може да се различава от цената в отделен магазин.</li>
          <li><b>ДДС.</b> Всички цени са с ДДС. В България ставката за храните е 20%; в Австрия от 1 юли 2026 г. е 4,9% за определени основни храни и 10% за повечето други, а за козметиката и хигиената е 20% и в двете държави.</li>
          <li><b>Доходи.</b> Една и съща цена тежи различно: средната заплата в Австрия е няколко пъти по-висока. Затова даваме и сравнението на Евростат, което отчита и цените, и потреблението.</li>
          <li><b>Цени на едро.</b> Средните цени, които ДКСБТ събира от стоковите тържища и пазари; не отразяват договорите на големите вериги директно с производители. Показваме ги както ги публикува комисията.</li>
          <li><b>Без заключения за отделни фирми.</b> Високата разлика е повод за въпрос (към веригата, КЗП или КЗК), не доказателство за нарушение. От 9 август 2026 г. до 9 август 2027 г. законът забранява икономически неоправдано повишаване на цените; проверките са на КЗП.</li>
          <li>Обновяване: цените в България всеки ден, в Австрия и на едро всяка седмица, Евростат веднъж годишно.</li>
        </ul>
      </Anchor>
    </Page>
  );
}
