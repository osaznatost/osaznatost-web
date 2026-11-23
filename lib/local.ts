import { data } from "@/lib/data";

export type Decl = {
    year: number; fiscalYear: number; filedAt: string; url: string; position: string; institution?: string | null; income: number; incomeSpouse: number;
    incomeBy?: { what: string; d: number; s: number }[];
    stakes: { company: string; share: string; kind: string; office: string; holder: string; valueEur: number | null }[];
    realEstate: number; vehicles: number; bankEur: number; debtEur: number; receivableEur: number; categories: string[];
};
export type Official = {
  slug: string; name: string; role: string; roleRaw: string; party: string | null; prefVotes: number | null; elected: boolean | null;
  listPos?: number | null; cycle?: string | null; history?: Decl[];
  decl: Decl | null;
};
export type Resolution = {
  id: string; date: string; session: string; number: string; title: string; tags: string[]; url: string | null; result: string | null;
  tally: { for: number; against: number; abstain: number; method: string } | null; votes: [string, string][];
  text?: string; rapporteur?: { name: string; role: string; slug: string | null } | null; proposedBy?: string;
};
export type LocalData = { code: string; name: string | null; generatedAt: string | null; officials: Official[]; resolutions: Resolution[] | null };

export const localData = (code: string) => data<LocalData>(`local/${code}.json`);
type LocalIndex = { updated: string; source: string; tags: Record<string, { bg: string }>; munis: Record<string, { name: string; officials: number; stakes: number; resolutions: number }> };
export const localIndex = async () => (await data<LocalIndex>("local/index.json"))!;

/** Нормализира име на фирма за сравнение: без правна форма, кавички и разлики между латиница и кирилица. */
const LAT: Record<string, string> = { A: "А", B: "В", C: "С", E: "Е", H: "Н", K: "К", M: "М", O: "О", P: "Р", T: "Т", X: "Х", Y: "У" };
export function normFirm(s: string) {
  return s.toUpperCase().replace(/[A-Z]/g, (c) => LAT[c] ?? c)
    .replace(/[„“"'«».,()\-–]/g, " ")
    .replace(/\s+/g, " ").trim()
    .split(" ").filter((w) => !["ЕООД", "ООД", "ЕАД", "АД", "ЕТ", "СД", "КД", "КДА", "ДЗЗД", "LTD"].includes(w)).join(" ");
}
export const VOTE_BG: Record<string, string> = { for: "За", against: "Против", abstain: "Въздържал се", absent: "Отсъства", "not_voted": "Не гласува" };

/** Индекс на всички длъжностни лица в общините: slug → [код на общината, име, длъжност]. */
type People = Record<string, [string, string, string]>;
export const localPeople = async () => (await data<People>("local/people.json")) ?? {};
export async function personBySlug(slug: string) {
  const p = (await localPeople())[slug];
  if (!p) return null;
  const L = await localData(p[0]);
  const o = L?.officials.find((x) => x.slug === slug);
  return o && L ? { o, L } : null;
}
export const personHref = (slug: string) => `/lica/${slug}`;
