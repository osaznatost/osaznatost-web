import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type Official = {
  slug: string; name: string; role: string; roleRaw: string; party: string | null; prefVotes: number | null; elected: boolean | null;
  decl: null | {
    year: number; fiscalYear: number; filedAt: string; url: string; position: string; income: number; incomeSpouse: number;
    stakes: { company: string; share: string; kind: string; office: string; holder: string; valueEur: number | null }[];
    realEstate: number; vehicles: number; bankEur: number; debtEur: number; receivableEur: number; categories: string[];
  };
};
export type Resolution = {
  id: string; date: string; session: string; number: string; title: string; tags: string[]; url: string | null; result: string | null;
  tally: { for: number; against: number; abstain: number; method: string } | null; votes: [string, string][];
};
export type LocalData = { code: string; name: string | null; generatedAt: string | null; officials: Official[]; resolutions: Resolution[] | null };

const dir = path.join(process.cwd(), "data", "local");
export function localData(code: string): LocalData | null {
  const f = path.join(dir, `${code}.json`);
  return existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as LocalData) : null;
}
export const LOCAL_INDEX = JSON.parse(readFileSync(path.join(dir, "index.json"), "utf8")) as {
  updated: string; source: string; tags: Record<string, { bg: string }>; munis: Record<string, { name: string; officials: number; stakes: number; resolutions: number }>;
};

/** Нормализира име на фирма за сравнение: без правна форма, кавички и разлики между латиница и кирилица. */
const LAT: Record<string, string> = { A: "А", B: "В", C: "С", E: "Е", H: "Н", K: "К", M: "М", O: "О", P: "Р", T: "Т", X: "Х", Y: "У" };
export function normFirm(s: string) {
  return s.toUpperCase().replace(/[A-Z]/g, (c) => LAT[c] ?? c)
    .replace(/[„“"'«».,()\-–]/g, " ")
    .replace(/\s+/g, " ").trim()
    .split(" ").filter((w) => !["ЕООД", "ООД", "ЕАД", "АД", "ЕТ", "СД", "КД", "КДА", "ДЗЗД", "LTD"].includes(w)).join(" ");
}
export const VOTE_BG: Record<string, string> = { for: "За", against: "Против", abstain: "Въздържал се", absent: "Отсъства", "not_voted": "Не гласува" };
