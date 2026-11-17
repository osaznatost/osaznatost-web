import funds from "@/data/funds.json";
import { MPS } from "@/lib/parliament";
import { fmt } from "@/lib/stats";

export type Programme = { code: string; name: string; period: string; fund: string; contracted: number; paid: number; pct: number; contracts: number };
export type ConfirmedCase = {
  id: string; person: string; programme: string; round?: string;
  beneficiaries: { name: string; eik: string; contractedEur: number; paidEur: number; contractCount: number }[];
  claim: { summary: string; reportedGrantBgn?: number; reportedTotalBgn?: number };
  sources: { outlet: string; title: string; url: string }[]; match: string; verification: string; status: string;
};
export const FUNDS = funds as unknown as {
  updated: string; source: { title: string; url: string; repo: string };
  byProgramme: Programme[];
  sankey: { nodes: { id: string; kind: string; label: string; total: number }[]; links: { source: string; target: string; value: number }[] };
  integrity: {
    totals: { programmeCount: number; highConcentrationCount: number; moderateConcentrationCount: number };
    programmes: Record<string, { hhi: number; band: string; top1Share: number; top1Name: string; beneficiaries: number; debarred: boolean }>;
    serial: { eik: string; name: string; programmes: number; total: number; top: { code: string; name: string; eur: number }[] }[];
  };
  mpConnected: { mpId: number; mp: string; eik: string; name: string; type: string; rel: { kind: string; current: boolean }[]; contracts: number; contracted: number; paid: number }[];
  confirmed: { measure: { name: string; fund: string; note: string; officialList: string }; cases: ConfirmedCase[] };
};
export const bn = (v: number) => `${fmt(v / 1e9, 2)} млрд. €`;
export const mn = (v: number) => (v >= 1e9 ? bn(v) : v >= 1e5 ? `${fmt(v / 1e6, 1)} млн. €` : `${Math.round(v).toLocaleString("bg-BG")} €`);
export const PERIOD: Record<string, string> = { "2014-20": "2014–2020", "2021-27": "2021–2027", RRP: "План за възстановяване", "2007-13": "2007–2013" };
export const FUND_NAME: Record<string, string> = { RRP: "Механизъм за възстановяване", ERDF: "Европейски фонд за регионално развитие", CF: "Кохезионен фонд", EAFRD: "Земеделски фонд за селските райони", ESF: "Европейски социален фонд", EMFF: "Фонд за морско дело и рибарство", JTF: "Фонд за справедлив преход", Other: "Други фондове" };
export const REL: Record<string, string> = {
  director: "управител", representative: "представител", owner: "собственик", partner: "съдружник", board: "член на съвет", procurator: "прокурист",
  stake: "дялово участие", manager: "управител", ngo_board: "член на управата на организация", sole_owner: "едноличен собственик",
  ngo_representative: "представител на организация", trustee: "довереник", actual_owner: "действителен собственик", declared_role: "роля, обявена в декларация",
  verifier: "заверител", liquidator: "ликвидатор",
};
export const findProgramme = (code: string) => FUNDS.byProgramme.find((p) => p.code === code);
export const progSlug = (code: string) => encodeURIComponent(code);

const norm = (s: string) => s.toUpperCase().replace(/\s+/g, " ").replace(/\s*-\s*/g, "-").trim();
/** Връзка към депутата: наша страница, ако е в настоящия парламент, иначе профилът в parliament.bg. */
export function mpHref(id: number, name: string) {
  const m = MPS.find((x) => (x as { pid?: number }).pid === id) ?? MPS.find((x) => norm(x.name) === norm(name));
  return m ? `/parlament/deputat/${m.id}` : `https://www.parliament.bg/bg/MP/${id}`;
}
