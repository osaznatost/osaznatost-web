// Решения на общинския съвет за общинско имущество (продажба, наем, право на строеж, концесия…), в които се споменава
// фирма на длъжностно лице или на негов бивш/настоящ съдружник (по Търговския регистър). Съвпадението е по име на фирмата в текста,
// затова името трябва да е с правната форма (… ООД, ЕТ …) или в кавички и поне две думи / 8 знака (иначе „Съгласие“ съвпада с думата „съгласие“).
import { data } from "@/lib/data";
import { localData, normFirm } from "@/lib/local";

export type TrLinks = Record<string, { name: string; firms: { eik: string; name: string }[]; co: { n: string; firms: { eik: string; name: string }[] }[] }>;
export type DealFirm = { eik: string; name: string; slug: string; who: string; via: string | null };
export type Deal = { code: string; number: string; date: string; title: string; url: string | null; firm: DealFirm };

export const PROP = /продажб|продава|отдава.{0,20}наем|под наем|аренд|право на строеж|право на ползване|право на надстрояване|концеси|замяна|безвъзмездно|учредява/i;
const LAT = "ABCEHKMOPTXY", CYR = "АВСЕНКМОРТХУ";
const up = (x: string) => x.toUpperCase().replace(/[ABCEHKMOPTXY]/g, (c) => CYR[LAT.indexOf(c)]);
const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "[\\s\\-–]+");
const core = (f: string) => normFirm(f).replace(/^(ЕТ|СД|КД)\s+/, "");
export function firmRe(name: string) {
  const n = core(name);
  if (n.length < 4) return null;
  return new RegExp(`(?:ЕТ\\s*[„"“]?\\s*${esc(n)}|${esc(n)}\\s*[“"”]?\\s*(?:ЕООД|ООД|ЕАД|АД)(?![А-Я])${n.includes(" ") || n.length >= 8 ? `|[„"“]\\s*${esc(n)}\\s*[“"”]` : ""})`);
}
const tc = (s: string) => s.toLowerCase().replace(/(^|[\s-])\S/g, (c) => c.toUpperCase());

/** Фирмите на длъжностните лица в общината (и на съдружниците им). */
export function firmsOf(links: TrLinks, only?: string): DealFirm[] {
  return Object.entries(links).filter(([slug]) => !only || slug === only).flatMap(([slug, p]) => [
    ...p.firms.map((f) => ({ eik: f.eik, name: f.name, slug, who: tc(p.name), via: null })),
    ...p.co.flatMap((c) => c.firms.map((f) => ({ eik: f.eik, name: f.name, slug, who: tc(p.name), via: tc(c.n) }))),
  ]);
}

/** Решенията в общината `code` за общинско имущество, в които се споменава някоя от фирмите. */
export async function propertyDeals(code: string, firms?: DealFirm[], onlySlug?: string): Promise<Deal[]> {
  const [L, links] = await Promise.all([localData(code), firms ? Promise.resolve(null) : data<TrLinks>(`tr-links/${code}.json`)]);
  if (!L?.resolutions?.length) return [];
  const fs = (firms ?? (links ? firmsOf(links, onlySlug) : [])).map((f) => ({ f, re: firmRe(f.name) })).filter((x) => x.re);
  if (!fs.length) return [];
  const out: Deal[] = [];
  for (const r of L.resolutions) {
    const t = `${r.title} ${r.text ?? ""}`;
    if (!PROP.test(t)) continue;
    const u = up(t);
    const hit = fs.find((x) => x.re!.test(u));
    if (hit) out.push({ code, number: r.number, date: r.date, title: r.title, url: r.url ?? null, firm: hit.f });
  }
  return out;
}
