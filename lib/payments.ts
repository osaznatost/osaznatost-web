// Плащания от СЕБРА: колко реално е платила държавата на дадена фирма (от юли 2022 г., над 5000 лв.).
// Получателите са само с име, затова свързването с фирмите е по нормализирано име, не по ЕИК.
import { createHash } from "node:crypto";
import { data } from "@/lib/data";

const FORMS = /\b(ЕООД|ООД|ЕАД|АД|ЕТ|ДЗЗД|КД|КДА|СД|ЕАДСИЦ|АДСИЦ|ЛТД|LTD|GMBH|SRL|SPA|S\.A\.|SA)\b/g;
export function normName(name: string) {
  let s = name.toUpperCase().replace(/Ё/g, "Е").replace(/[„“"'«»`]/g, " ");
  s = s.replace(/(^|[^0-9A-ZА-Я])(ЕООД|ООД|ЕАД|АД|ЕТ|ДЗЗД|КД|КДА|СД|ЕАДСИЦ|АДСИЦ|ЛТД|LTD|GMBH|SRL|SPA|SA)(?=[^0-9A-ZА-Я]|$)/g, " ");
  return s.replace(FORMS, " ").replace(/[^0-9A-ZА-Я]+/g, " ").replace(/\s+/g, " ").trim();
}
export type Receiver = { name: string; total: number; n: number; payers: [string, number, number, string | null, string | null][]; top: [number, string | null, string, string][]; amb?: [string, number][] };
export async function paidTo(name: string): Promise<Receiver | null> {
  const k = normName(name);
  if (!k) return null;
  const sh = createHash("md5").update(k).digest("hex").slice(0, 2);
  return (await data<Record<string, Receiver>>(`payments/receivers/${sh}.json`))?.[k] ?? null;
}
type Payers = Record<string, { name: string; top: [string, string, number][] }>;
const payersAll = async () => (await data<Payers>("payments/payers.json")) ?? {};
export async function paidBy(name: string) {
  return (await payersAll())[normName(name)] ?? null;
}
export async function paymentsIndex() {
  return (await data<{ quarters: string[]; source: string; minEur: number }>("payments/index.json")) ?? { quarters: [], source: "", minEur: 0 };
}

const close = (a: string, b: string) => { const x = normName(a), y = normName(b); return !!x && !!y && (x === y || x.startsWith(y + " ") || y.startsWith(x + " ")); };
/** Плащанията от даден възложител към дадена фирма (платецът се сравнява по име, вкл. „-ЦУ“ и подобни). */
export async function paidFromTo(buyer: string, supplier: string) {
  const r = await paidTo(supplier);
  if (!r) return null;
  const rows = r.payers.filter((p) => close(p[0], buyer));
  if (!rows.length) return { receiver: r, sum: 0, n: 0, first: null as string | null, last: null as string | null, rows };
  return { receiver: r, sum: rows.reduce((a, p) => a + p[1], 0), n: rows.reduce((a, p) => a + p[2], 0), first: rows.map((p) => p[3]).filter(Boolean).sort()[0] ?? null, last: rows.map((p) => p[4]).filter(Boolean).sort().at(-1) ?? null, rows };
}
/** Платците, чието име отговаря на възложителя (централно управление, териториални звена). */
export async function payersLike(buyer: string) {
  const k = normName(buyer);
  return Object.entries(await payersAll()).filter(([pk]) => pk === k || pk.startsWith(k + " ")).map(([, v]) => v);
}
