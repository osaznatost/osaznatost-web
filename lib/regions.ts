import funds from "@/data/funds.json";
import { NUTS3_BY_PREFIX } from "@/lib/economy";
import { muniFinance, OBLASTS, type Municipality } from "@/lib/places";
import { ELECTIONS, PARTY_META } from "@/lib/partyMeta";
import { STATS } from "@/lib/stats";

type FundMuni = { contracts: number; total: number; paid: number; perCapita: number; pop: number };
const FM = (funds as unknown as { munis: Record<string, FundMuni> }).munis;
const EM = ELECTIONS.munis as Record<string, { name: string; oblast: string; total: number; reg: number; voted: number; v: Record<string, number> }>;

export const oblastSlug = (code: string) => code.slice(0, 3).toLowerCase();
export const muniSlug = (code: string) => code.toLowerCase();
const NUTS: Record<string, string> = { ...NUTS3_BY_PREFIX, SOF: "BG411" };

export function oblastList() {
  return OBLASTS.map((o) => ({ ...o, prefix: o.municipalities[0].code.slice(0, 3) })).map((o) => ({ ...o, slug: o.prefix.toLowerCase(), nuts: NUTS[o.prefix] }));
}
export const findOblastBySlug = (slug: string) => oblastList().find((o) => o.slug === slug);

/** Евросредства за общината (София е обща община SOF00 в ИСУН). */
export const muniFunds = (code: string): FundMuni | undefined => FM[code === "SOF46" ? "SOF00" : code];

/** Изборни резултати за общината; София (SOF46) събира трите МИР по райони. */
export function muniElection(code: string) {
  const codes = code === "SOF46" ? Object.keys(EM).filter((c) => /^S2[345]/.test(c)) : [code];
  const rows = codes.map((c) => EM[c]).filter(Boolean);
  if (!rows.length) return undefined;
  const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((a, r) => a + (f(r) ?? 0), 0);
  const total = sum((r) => r.total), reg = sum((r) => r.reg), voted = sum((r) => r.voted);
  const lists = [...new Map(PARTY_META.map((p) => [p.ballot, p])).values()].map((p) => ({
    ballot: p.ballot, name: p.sharedList ? p.list : p.name, color: p.color, slug: p.slug, votes: sum((r) => r.v[String(p.ballot)]),
  })).map((x) => ({ ...x, pct: total ? (x.votes / total) * 100 : 0 })).sort((a, b) => b.votes - a.votes);
  return { total, reg, voted, turnout: reg ? (voted / reg) * 100 : undefined, lists };
}

export function oblastStats(prefix: string, munis: Municipality[]) {
  const nuts = NUTS[prefix];
  const pcLine = nuts ? STATS.series.gdp_pc_oblasts?.lines[nuts] : undefined;
  const pcYear = pcLine ? Math.max(...Object.keys(pcLine).map(Number)) : undefined;
  const fundsRows = munis.map((m) => muniFunds(m.code)).filter((x): x is FundMuni => !!x);
  const pop = fundsRows.reduce((a, f) => a + (f.pop ?? 0), 0);
  const eu = fundsRows.reduce((a, f) => a + f.total, 0);
  return { nuts, gdpPc: pcLine && pcYear ? { year: pcYear, value: pcLine[String(pcYear)] } : undefined, pop, eu, euPc: pop ? eu / pop : undefined };
}

export { muniFinance };
