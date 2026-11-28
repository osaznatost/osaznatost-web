// Сигналите за една фирма — една и съща сметка за карето в страницата на фирмата, за API-то и за значките в списъците.
import { supplierAnnexes, supplierContracts, supplierStats } from "@/lib/procurement";
import { contractContext, contractFlags, linkStrength, riskScore } from "@/lib/redFlags";
import { politicalLinks } from "@/lib/procurement";
import { napDebt } from "@/lib/napDebtors";
import { officialLinks } from "@/components/PersonLinks";
import { firmDeals } from "@/components/PropertyDeals";

export type FirmSig = { level: "high" | "mid"; kind: "officials" | "political" | "debt" | "property" | "risk" | "flags" | "single"; n: number };

/** Оценява договорите на фирмата като в страницата на договора (контекстът — за първите 10 по предварителна оценка). */
export async function scoreFirm(eik: string) {
  const [contracts, annexes] = await Promise.all([supplierContracts(eik), supplierAnnexes(eik)]);
  const political = await linkStrength([eik]);
  const pre = await Promise.all(contracts.map(async (c) => {
    const ax = annexes.filter((a) => a.buyer_eik === c.buyer_eik && a.contract_number === c.contract_number);
    const f = await contractFlags(c, ax, political);
    return { c, ax, f, score: riskScore(f) };
  }));
  const top = new Set([...pre].sort((a, b) => b.score - a.score).slice(0, 10));
  const scored = await Promise.all(pre.map(async (x) => {
    if (!top.has(x)) return { c: x.c, f: x.f, score: x.score };
    const f = await contractFlags(x.c, x.ax, political, await contractContext(x.c));
    return { c: x.c, f, score: riskScore(f) };
  }));
  return { contracts, annexes, political, scored };
}

/** Сигналите (без текста): кои видове, с какво ниво и колко. */
export async function firmSignals(eik: string, pre?: Awaited<ReturnType<typeof scoreFirm>>) {
  const S = pre ?? await scoreFirm(eik);
  const [st, offs, debt, deals] = await Promise.all([supplierStats(eik).catch(() => null), officialLinks(eik).catch(() => []), napDebt(eik).catch(() => null), firmDeals(eik).catch(() => [])]);
  const pl = politicalLinks(eik).length && S.political > 0 ? politicalLinks(eik).length : 0;
  const high = S.scored.filter((x) => x.score >= 45).length, mid = S.scored.filter((x) => x.score >= 20 && x.score < 45).length;
  const flags = new Set(S.scored.flatMap((x) => x.f.filter((f) => f.weight > 0).map((f) => f.id)));
  const total = st?.contracts ?? S.contracts.length, single = st?.single_offer ?? 0;
  const out: FirmSig[] = [];
  if (offs.length) out.push({ level: "high", kind: "officials", n: offs.length });
  if (pl) out.push({ level: S.political === 2 ? "high" : "mid", kind: "political", n: pl });
  if (debt) out.push({ level: debt.eur >= 50000 ? "high" : "mid", kind: "debt", n: Math.round(debt.eur) });
  if (deals.length) out.push({ level: "high", kind: "property", n: deals.length });
  if (high || mid) out.push({ level: high ? "high" : "mid", kind: "risk", n: high + mid });
  if (flags.size) out.push({ level: "mid", kind: "flags", n: flags.size });
  if (total >= 5 && single / total >= 0.5) out.push({ level: "mid", kind: "single", n: Math.round((single / total) * 100) });
  return { sigs: out, offs, debt, deals, pl, high, mid, single, total, S };
}

/** Готовото нощно обобщение (scripts/build-firm-signals.mjs): ЕИК → [брой сигнали, сериозни, видове, дата]. */
export async function firmSigMany(eiks: string[]) {
  const { data } = await import("@/lib/data");
  const out = new Map<string, { n: number; high: number; kinds: string[] }>();
  const by = new Map<string, string[]>();
  for (const e of new Set(eiks)) (by.get(e.slice(0, 2)) ?? by.set(e.slice(0, 2), []).get(e.slice(0, 2))!).push(e);
  await Promise.all([...by.entries()].map(async ([k, es]) => {
    const sh = await data<Record<string, [number, number, string[], string]>>(`proc/firm-signals/${k}.json`).catch(() => null);
    for (const e of es) { const x = sh?.[e]; if (x) out.set(e, { n: x[0], high: x[1], kinds: x[2] }); }
  }));
  return out;
}
const KIND: Record<string, string> = { officials: "свързана с длъжностни лица", political: "връзка с политик", debt: "длъжник към НАП", property: "общинско имущество", risk: "рискови договори", flags: "флагове в договорите", single: "без конкуренция" };
export const sigTitle = (kinds: string[]) => kinds.map((k) => KIND[k.split(":")[0]] ?? k).join(", ");
