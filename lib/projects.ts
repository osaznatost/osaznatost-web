// Пътят на един проект: решение на общинския съвет → поръчка → договор → изпълнение → надзор и приемане.
// Свързва поръчките (ЦАИС ЕОП) с решенията на съвета, хората на възложителя и изпълнителя и местната власт.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Contract } from "@/lib/procurement";
import type { Resolution } from "@/lib/local";

type TenderPeople = {
  title: string | null; buyer: string; contacts: string[]; method: string | null; bids: number | null;
  suppliers: Record<string, { name: string; rep: string | null; town: string | null }>; amend: { date: string | null; text: string }[];
};
const DIR = path.join(process.cwd(), "data", "projects", "people");
const cache = new Map<string, Record<string, TenderPeople>>();
function load(code: string | null | undefined) {
  if (!code) return {};
  if (!cache.has(code)) { const f = path.join(DIR, `${code}.json`); cache.set(code, existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as { tenders: Record<string, TenderPeople> }).tenders : {}); }
  return cache.get(code)!;
}
const SF = path.join(process.cwd(), "data", "projects", "state.json");
const P = existsSync(SF) ? (JSON.parse(readFileSync(SF, "utf8")) as { first: string | null; last: string | null }) : { first: null, last: null };
/** Хората по поръчка (по кода на общината на възложителя). */
export const peopleFor = (code: string | null | undefined, tenderId: number | string) => load(code)[String(tenderId)] ?? null;
export const PEOPLE_RANGE = { first: P.first, last: P.last };

const STOP = new Set(("община общината ботевград ботевград“ ремонт ремонтни реконструкция рехабилитация изпълнение изпълнението обект обекта проект проекта строително строителни строителство монтажни работи работа " +
  "доставка доставки услуги услуга територията обществена поръчка предмет връзка изграждане основен основни текущ текущи нужди нуждите съществуващи съществуваща " +
  "общински общинска общинско общинските улици улица пътища пътна позиция обособена позиции включително свързани дейности дейност инженеринг" ).split(/\s+/));
const norm = (s: string) => s.toLowerCase().replace(/[„“"'«»()]/g, " ");
/** Отличителните думи в заглавието: имена на улици, села, обекти. */
export function tokens(title: string) {
  const t = norm(title);
  const places = [...t.matchAll(/(?:ул\.|с\.|кв\.|м\.|гр\.)\s*([а-я][а-я-]{2,}(?:\s+[а-я][а-я-]{2,})?)/g)].map((m) => m[1].trim());
  const words = t.split(/[^а-я0-9]+/).filter((w) => w.length >= 5 && !STOP.has(w));
  return { places: [...new Set(places)], words: [...new Set(words)] };
}
const stem = (w: string) => w.slice(0, Math.max(5, w.length - 2));

/** Решения на съвета, които най-вероятно са за същия обект. Съвпадение по думи, не сигурна връзка. */
export function councilFor(c: Pick<Contract, "tender_name" | "contract_date">, res: Resolution[] | null) {
  if (!res?.length || !c.contract_date) return [];
  const a = tokens(c.tender_name);
  const aw = new Set(a.words.map(stem));
  const lo = new Date(Date.parse(c.contract_date) - 3 * 365 * 864e5).toISOString().slice(0, 10);
  const hi = new Date(Date.parse(c.contract_date) + 365 * 864e5).toISOString().slice(0, 10);
  return res
    .filter((r) => r.date >= lo && r.date <= hi)
    .map((r) => {
      const b = tokens(`${r.title} ${r.text ?? ""}`);
      const shared = [...new Set(b.words.map(stem))].filter((w) => aw.has(w));
      const place = a.places.filter((p) => b.places.includes(p));
      return { r, shared, place, score: shared.length + 2 * place.length };
    })
    .filter((x) => x.score >= 3 && (x.place.length > 0 || x.shared.length >= 3))
    .sort((x, y) => y.score - x.score)
    .slice(0, 3);
}

/** Договори за строителен надзор или инвеститорски контрол по същия обект (те подписват актовете за приемане). */
export function supervisionFor(c: Contract, buyerContracts: Contract[]) {
  const a = new Set(tokens(c.tender_name).words.map(stem));
  return buyerContracts
    .filter((x) => x.id !== c.id && /надзор|инвеститорски контрол|оценка (за )?съответствие/i.test(x.tender_name))
    .map((x) => ({ x, n: tokens(x.tender_name).words.map(stem).filter((w) => a.has(w)).length + (x.tender_id === c.tender_id ? 5 : 0) }))
    .filter((y) => y.n >= 3)
    .sort((p, q) => q.n - p.n)
    .slice(0, 3)
    .map((y) => y.x);
}

export const CATEGORY: [string, RegExp][] = [
  ["Улици, пътища, тротоари", /улиц|път|асфалт|тротоар|паваж|пътн|мост|велоале|кръстовищ|настилк/i],
  ["Вода и канализация", /водопровод|канализ|пречиств|дъждов|отводн|вик\b/i],
  ["Сгради: училища, градини, жилищни", /сград|училищ|градин|ясла|читалищ|залa|зала|блок|жилищн|покрив|енергийн/i],
  ["Осветление", /осветл/i],
  ["Паркове, площадки, спорт", /парк|площадк|стадион|спорт|детск/i],
];
export const categoryOf = (t: string) => CATEGORY.find(([, re]) => re.test(t))?.[0] ?? "Други";
export const deadlineOf = (c: Pick<Contract, "contract_date" | "contract_period_days">) =>
  c.contract_date && c.contract_period_days ? new Date(Date.parse(c.contract_date) + c.contract_period_days * 864e5).toISOString().slice(0, 10) : null;

/** Лице за контакт → длъжностно лице от общината (по първо и последно име), ако съвпада. */
export function officialByName<T extends { name: string; slug: string; roleRaw: string }>(name: string, officials: T[] | undefined) {
  const p = name.toUpperCase().split(/\s+/).filter(Boolean);
  if (p.length < 2 || !officials) return null;
  return officials.find((o) => { const q = o.name.toUpperCase().split(/\s+/); return q[0] === p[0] && q.at(-1) === p.at(-1) && (p.length < 3 || q.length < 3 || q[1] === p[1]); }) ?? null;
}

/** Поръчките, в които лицето е посочено като лице за контакт на възложителя. */
export function tendersByContact(code: string, name: string) {
  const p = name.toUpperCase().split(/\s+/);
  return Object.entries(load(code)).filter(([, t]) => t.contacts.some((c) => { const q = c.toUpperCase().split(/\s+/).filter(Boolean); return q[0] === p[0] && q.at(-1) === p.at(-1); }))
    .map(([id, t]) => ({ id, title: t.title ?? "", suppliers: Object.values(t.suppliers).map((s) => s.name) }));
}
