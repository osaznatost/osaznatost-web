// Концесиите от Националния концесионен регистър (data/concessions.json, scripts/import-concessions.mjs).
import { data } from "@/lib/data";

export type Concession = { id: string; reg: string; status: string; name: string; type: string; subject: string; conceder: string; firms: { name: string; eik: string | null }[]; value: string | null; term: string | null; muni: string | null };
export const concFile = () => data<{ updated: string; source: string; items: Concession[] }>("concessions.json");
export const concUrl = (c: Concession) => `https://nkr.government.bg/ConcessionaireProcedures/ConcessionaireProcedureInfo/${c.id}`;
export async function concessionsOfMuni(code: string) {
  return ((await concFile())?.items ?? []).filter((c) => c.muni === code);
}
export async function concessionsOfFirm(eik: string) {
  const e = eik.slice(0, 9);
  return ((await concFile())?.items ?? []).filter((c) => c.firms.some((f) => f.eik?.slice(0, 9) === e));
}
/** „300 мес.“ → „25 г.“ */
export const termText = (t: string | null) => { const m = t?.match(/^(\d+) мес/); return m && Number(m[1]) % 12 === 0 ? `${Number(m[1]) / 12} г.` : t; };
export const shortName = (s: string) => (s.length > 140 ? `${s.slice(0, 140).replace(/\s\S*$/, "")}…` : s);
