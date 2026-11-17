import raw from "@/data/places.json";
import fin from "@/data/municipal-finance.json";

type Settlement = [ekatte: string, name: string, isVillage: 0 | 1];
export type Municipality = { code: string; name: string; settlements: Settlement[] };
export type Oblast = { name: string; municipalities: Municipality[] };
export const OBLASTS = (raw as { oblasts: Oblast[] }).oblasts;

export const findOblast = (name?: string) => OBLASTS.find((o) => o.name === name);
export function findMunicipality(code?: string) {
  for (const o of OBLASTS) for (const m of o.municipalities) if (m.code === code) return { oblast: o.name, ...m };
  return undefined;
}
export function findSettlement(ekatte?: string) {
  for (const o of OBLASTS) for (const m of o.municipalities) for (const s of m.settlements)
    if (s[0] === ekatte) return { oblast: o.name, municipality: m.name, code: m.code, ekatte: s[0], name: s[1], isVillage: Boolean(s[2]) };
  return undefined;
}

export type MuniFinance = {
  name: string; period: string; revenue: number | null; expenditure: number | null; balance: number | null; debt: number | null;
  arrears: number | null; cash: number | null; ownShare: number | null; coverage: number | null; wageShare: number | null;
  capitalShare: number | null; debtPerCapita: number | null; collection: number | null; recovery: boolean;
  history: { year: number; revenue: number | null; expenditure: number | null; debt: number | null; arrears: number | null }[];
};
const FIN = fin as unknown as { source: string; latest: string; byCode: Record<string, MuniFinance> };
export const FIN_SOURCE = FIN.source;
export const muniFinance = (code?: string) => (code ? FIN.byCode[code] : undefined);
export const quarterLabel = (p: string) => {
  const [y, q] = p.split("-Q");
  return { "1": `януари–март ${y}`, "2": `януари–юни ${y}`, "3": `януари–септември ${y}`, "4": `цялата ${y}` }[q] ?? p;
};
