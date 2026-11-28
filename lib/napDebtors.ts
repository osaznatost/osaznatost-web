// Длъжници към НАП (публичният списък по чл. 182, ал. 3, т. 2 от ДОПК): фирми с неплатени данъци и осигуровки над 2 556,46 €.
// Данните са моментна снимка към index.asOf (scripts/import-nap-debtors.mjs).
import { data } from "@/lib/data";

export type NapDebt = { name: string; form: string; eur: number; since: string | null; td: string };
export async function napDebt(eik: string): Promise<NapDebt | null> {
  const e = (eik ?? "").replace(/\D/g, "");
  if (e.length < 9) return null;
  const sh = await data<Record<string, [string, string, number, string | null, string]>>(`proc/nap-debtors/${e.slice(0, 2)}.json`);
  const v = sh?.[e] ?? sh?.[e.slice(0, 9)];
  return v ? { name: v[0], form: v[1], eur: v[2], since: v[3], td: v[4] } : null;
}
export async function napDebtsMany(eiks: string[]) {
  const out = new Map<string, NapDebt>();
  await Promise.all([...new Set(eiks)].map(async (e) => { const d = await napDebt(e); if (d) out.set(e, d); }));
  return out;
}
export async function napIndex() {
  return (await data<{ asOf: string | null; count: number; totalEur: number; source: string }>("proc/nap-debtors/index.json")) ?? null;
}
