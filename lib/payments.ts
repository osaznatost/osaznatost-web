// Плащания от СЕБРА: колко реално е платила държавата на дадена фирма (2024 г. насам, над 5000 лв.).
// Получателите са само с име, затова свързването с фирмите е по нормализирано име, не по ЕИК.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "data", "payments");
const FORMS = /\b(ЕООД|ООД|ЕАД|АД|ЕТ|ДЗЗД|КД|КДА|СД|ЕАДСИЦ|АДСИЦ|ЛТД|LTD|GMBH|SRL|SPA|S\.A\.|SA)\b/g;
export function normName(name: string) {
  let s = name.toUpperCase().replace(/Ё/g, "Е").replace(/[„“"'«»`]/g, " ");
  s = s.replace(/(^|[^0-9A-ZА-Я])(ЕООД|ООД|ЕАД|АД|ЕТ|ДЗЗД|КД|КДА|СД|ЕАДСИЦ|АДСИЦ|ЛТД|LTD|GMBH|SRL|SPA|SA)(?=[^0-9A-ZА-Я]|$)/g, " ");
  return s.replace(FORMS, " ").replace(/[^0-9A-ZА-Я]+/g, " ").replace(/\s+/g, " ").trim();
}
export type Receiver = { name: string; total: number; n: number; payers: [string, number, number, string | null, string | null][]; top: [number, string | null, string, string][] };
const shards = new Map<string, Record<string, Receiver>>();
export function paidTo(name: string): Receiver | null {
  const k = normName(name);
  if (!k) return null;
  const sh = createHash("md5").update(k).digest("hex").slice(0, 2);
  if (!shards.has(sh)) { const f = path.join(DIR, "receivers", `${sh}.json`); shards.set(sh, existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : {}); }
  return shards.get(sh)![k] ?? null;
}
let payers: Record<string, { name: string; top: [string, string, number][] }> | null = null;
export function paidBy(name: string) {
  if (!payers) { const f = path.join(DIR, "payers.json"); payers = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : {}; }
  return payers![normName(name)] ?? null;
}
let idx: { quarters: string[]; source: string; minEur: number } | null = null;
export function paymentsIndex() {
  if (!idx) { const f = path.join(DIR, "index.json"); idx = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : { quarters: [], source: "", minEur: 0 }; }
  return idx!;
}

const close = (a: string, b: string) => { const x = normName(a), y = normName(b); return !!x && !!y && (x === y || x.startsWith(y + " ") || y.startsWith(x + " ")); };
/** Плащанията от даден възложител към дадена фирма (платецът се сравнява по име, вкл. „-ЦУ“ и подобни). */
export function paidFromTo(buyer: string, supplier: string) {
  const r = paidTo(supplier);
  if (!r) return null;
  const rows = r.payers.filter((p) => close(p[0], buyer));
  if (!rows.length) return { receiver: r, sum: 0, n: 0, first: null as string | null, last: null as string | null, rows };
  return { receiver: r, sum: rows.reduce((a, p) => a + p[1], 0), n: rows.reduce((a, p) => a + p[2], 0), first: rows.map((p) => p[3]).filter(Boolean).sort()[0] ?? null, last: rows.map((p) => p[4]).filter(Boolean).sort().at(-1) ?? null, rows };
}
/** Платците, чието име отговаря на възложителя (централно управление, териториални звена). */
export function payersLike(buyer: string) {
  if (!payers) paidBy("");
  const k = normName(buyer);
  return Object.entries(payers!).filter(([pk]) => pk === k || pk.startsWith(k + " ")).map(([, v]) => v);
}
