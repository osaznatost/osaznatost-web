import type { Contract } from "@/lib/procurement";

/** Прагове по ЗОП (чл. 20, ал. 2 и 3), в евро по фиксирания курс: над тях е нужна процедура, под тях — събиране на оферти или пряко възлагане. */
export const THRESHOLDS = { works: 270000 / 1.95583, other: 70000 / 1.95583, worksLow: 50000 / 1.95583, otherLow: 30000 / 1.95583 };

const STOP = new Set(["на", "за", "и", "в", "във", "от", "по", "с", "със", "към", "до", "при", "град", "гр", "община", "обект", "изпълнение", "строително", "строителни", "дейности", "услуги", "доставка", "доставки", "извършване", "процедура", "обособена", "позиция", "част", "на", "лот", "основен", "текущ"]);
const tokens = (s: string) => new Set((s.toLowerCase().replace(/[„“"'()\-–,.;:№\/]/g, " ").match(/[а-яa-z0-9]{3,}/g) ?? []).filter((w) => !STOP.has(w)).map((w) => w.slice(0, 7)));
const jaccard = (a: Set<string>, b: Set<string>) => { let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i || 1); };

export type Cluster = { key: string; contracts: Contract[]; total: number; months: number; suppliers: string[] };

/** Поръчки със сходен предмет (сходство на думите ≥ 0,55) в рамките на 24 месеца, от поне две различни процедури и поне 90 дни една от друга: кандидати за повтаряща се работа. */
export function repeatedWork(cs: Contract[]): Cluster[] {
  const items = cs.filter((c) => c.tender_name && c.contract_date).map((c) => ({ c, t: tokens(c.tender_name), d: Date.parse(c.contract_date!) }));
  const used = new Set<number>(); const out: Cluster[] = [];
  for (let i = 0; i < items.length; i++) {
    if (used.has(i) || items[i].t.size < 2) continue;
    const group = [i];
    for (let j = i + 1; j < items.length; j++) {
      if (used.has(j)) continue;
      if (Math.abs(items[j].d - items[i].d) > 730 * 864e5) continue;
      if (jaccard(items[i].t, items[j].t) >= 0.55 && items[i].c.tender_name !== items[j].c.tender_name || (items[i].c.tender_name === items[j].c.tender_name && items[i].c.contract_number !== items[j].c.contract_number && items[i].c.lot === items[j].c.lot)) group.push(j);
    }
    // Обособените позиции на една процедура (един tender_id или един ден) не са повторна работа:
    // искаме поне две различни процедури и поне 90 дни между първата и последната.
    const tenders = new Set(group.map((g) => items[g].c.tender_id || items[g].c.contract_date));
    const span = Math.max(...group.map((g) => items[g].d)) - Math.min(...group.map((g) => items[g].d));
    // Годишни услуги („… за 2022 г.“, „… за 2023 г.“) са очаквано повторение, не повторна работа.
    const years = group.map((g) => items[g].c.tender_name.match(/20\d\d/)?.[0]);
    const annual = years.every(Boolean) && new Set(years).size === group.length;
    if (group.length >= 2 && tenders.size >= 2 && span >= 90 * 864e5 && !annual) {
      group.forEach((g) => used.add(g));
      const cc = group.map((g) => items[g].c).sort((a, b) => (a.contract_date! < b.contract_date! ? -1 : 1));
      const ds = group.map((g) => items[g].d);
      out.push({ key: cc[0].id, contracts: cc, total: cc.reduce((s, c) => s + (c.contract_value_eur ?? 0), 0), months: Math.round((Math.max(...ds) - Math.min(...ds)) / (30.4 * 864e5)), suppliers: [...new Set(cc.flatMap((c) => c.supplier_names))] });
    }
  }
  return out.sort((a, b) => b.contracts.length - a.contracts.length || b.total - a.total);
}

export type Split = { supplier: string; eik: string; contracts: Contract[]; total: number; threshold: number; kind: string };
/** Няколко договора с една и съща фирма за 90 дни, всеки под прага, но заедно над него. */
export function possibleSplits(cs: Contract[]): Split[] {
  const by = new Map<string, Contract[]>();
  for (const c of cs) if (c.contract_date && c.contract_value_eur) for (const e of c.supplier_eiks) (by.get(e) ?? by.set(e, []).get(e)!).push(c);
  const out: Split[] = [];
  for (const [eik, list] of by) {
    for (const kind of ["works", "other"] as const) {
      const th = THRESHOLDS[kind];
      const sub = list.filter((c) => (kind === "works" ? /строител|works/i.test(c.contract_type ?? "") : !/строител|works/i.test(c.contract_type ?? "")) && (c.contract_value_eur ?? 0) < th)
        .sort((a, b) => (a.contract_date! < b.contract_date! ? -1 : 1));
      for (let i = 0; i < sub.length; i++) {
        const win = sub.filter((c) => { const d = Date.parse(c.contract_date!) - Date.parse(sub[i].contract_date!); return d >= 0 && d <= 90 * 864e5; });
        const total = win.reduce((s, c) => s + (c.contract_value_eur ?? 0), 0);
        if (win.length >= 2 && total > th) {
          out.push({ supplier: win[0].supplier_names[win[0].supplier_eiks.indexOf(eik)] ?? eik, eik, contracts: win, total, threshold: th, kind: kind === "works" ? "строителство" : "доставки и услуги" });
          break;
        }
      }
    }
  }
  return out.sort((a, b) => b.total - a.total);
}

export const CATEGORIES: { id: string; label: string; re: RegExp }[] = [
  { id: "roads", label: "Улици, пътища, асфалт, тротоари", re: /асфалт|улиц|път|тротоар|настилк|паваж|пътн|кръгов|площад/i },
  { id: "sport", label: "Спорт: зали, стадиони, клубове", re: /спорт|стадион|баскетбол|футбол|волейбол|басейн|зала|игрище/i },
  { id: "schools", label: "Училища и детски градини", re: /училищ|детск[аи] градин|ясл|гимназ|образоват/i },
  { id: "water", label: "Вода, канализация, отпадъци", re: /вод[аоп]|канализ|ВиК|отпадъ|сметищ|пречиств/i },
  { id: "buildings", label: "Сгради, ремонти, енергийна ефективност", re: /сград|ремонт|санир|енергийн|покрив|фасад/i },
  { id: "social", label: "Социални услуги и здраве", re: /социалн|възрастни|болниц|здрав|медицин|храна за|топъл обяд/i },
  { id: "events", label: "Празници, реклама, туризъм", re: /празни|фестивал|концерт|реклам|туризъм|туристическ|хотел/i },
  { id: "it", label: "Техника, софтуер, коли", re: /компют|софтуер|автомоб|превозн|техника|информационн/i },
];
export function byCategory(cs: Contract[]) {
  const total = cs.reduce((s, c) => s + (c.contract_value_eur ?? 0), 0);
  const rows = CATEGORIES.map((k) => {
    const list = cs.filter((c) => k.re.test(`${c.tender_name} ${c.cpv_desc ?? ""}`));
    const sum = list.reduce((s, c) => s + (c.contract_value_eur ?? 0), 0);
    return { ...k, n: list.length, sum, share: total ? sum / total : 0 };
  }).filter((r) => r.n).sort((a, b) => b.sum - a.sum);
  return { total, rows };
}

/** Индекс на концентрация (Херфиндал–Хиршман) по дял от стойността, 0–10 000. Над 2 500 = силно концентрирано. */
export function hhi(cs: Contract[]) {
  const by = new Map<string, number>(); let total = 0;
  for (const c of cs) { const v = c.contract_value_eur ?? 0; total += v; c.supplier_eiks.forEach((e) => by.set(e, (by.get(e) ?? 0) + v / c.supplier_eiks.length)); }
  return total ? Math.round([...by.values()].reduce((s, v) => s + ((v / total) * 100) ** 2, 0)) : 0;
}

export type Rotation = { label: string; a: { eik: string; name: string; n: number }; b: { eik: string; name: string; n: number }; total: number; switches: number; seq: Contract[] };
/** „Редуващи се победители“: в една категория двама изпълнители печелят повечето поръчки и се сменят почти всеки път.
 *  Правило: и двамата имат поне 3 договора, заедно поне 60% от договорите в категорията, а при поне 60% от поредните им договори победителят се сменя. */
export function rotatingWinners(cs: Contract[]): Rotation[] {
  const out: Rotation[] = [];
  for (const k of CATEGORIES) {
    const list = cs.filter((c) => c.contract_date && c.supplier_eiks.length && k.re.test(`${c.tender_name} ${c.cpv_desc ?? ""}`)).sort((x, y) => (x.contract_date! < y.contract_date! ? -1 : 1));
    if (list.length < 6) continue;
    const cnt = new Map<string, { name: string; n: number }>();
    for (const c of list) { const e = c.supplier_eiks[0]; const x = cnt.get(e) ?? { name: c.supplier_names[0] ?? e, n: 0 }; x.n++; cnt.set(e, x); }
    const [A, B] = [...cnt.entries()].sort((x, y) => y[1].n - x[1].n);
    if (!A || !B || B[1].n < 3 || (A[1].n + B[1].n) / list.length < 0.6) continue;
    const seq = list.filter((c) => c.supplier_eiks[0] === A[0] || c.supplier_eiks[0] === B[0]);
    let sw = 0;
    for (let i = 1; i < seq.length; i++) if (seq[i].supplier_eiks[0] !== seq[i - 1].supplier_eiks[0]) sw++;
    if (out.some((o) => [o.a.eik, o.b.eik].sort().join() === [A[0], B[0]].sort().join())) continue;
    if (sw / (seq.length - 1) >= 0.6) out.push({ label: k.label, a: { eik: A[0], ...A[1] }, b: { eik: B[0], ...B[1] }, total: list.length, switches: sw, seq });
  }
  return out;
}
