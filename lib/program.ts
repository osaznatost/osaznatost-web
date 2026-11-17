import current from "@/data/program.json";
import history from "@/data/program-history.json";
import { LAWS } from "@/lib/laws";
import { VOTES } from "@/lib/parliament";
import { lawFromTitle } from "@/lib/voteExplain";

export type ProgramAct = { id: number; sign: string; title: string; type: number };
export type ProgramPoint = { n: number; text: string; control: boolean; acts: ProgramAct[] };
export type Program = { from: string; to: string; status: string; approved: boolean; kind: string; time: string[]; note: string; points: ProgramPoint[]; source: string; fetched?: string };

export const PROGRAM = current as Program;
export const PROGRAM_HISTORY = history as Program[];

const lawSlugs = new Set(VOTES.map((v) => lawFromTitle(v.title)?.slug).filter(Boolean) as string[]);

export type ParsedPoint = {
  n: number;
  stage: "първо четене" | "второ четене" | "избор" | "контрол" | "решение" | "друго";
  title: string;
  sponsors?: string;
  firstReading?: string;
  day?: string;
  slug?: string;
  analysed: boolean;
  acts: ProgramAct[];
  text: string;
};

export function parsePoint(p: ProgramPoint): ParsedPoint {
  const t = p.text;
  const stage: ParsedPoint["stage"] = /^второ гласуване/i.test(t) ? "второ четене" : /^първо гласуване/i.test(t) ? "първо четене"
    : /^избор/i.test(t) ? "избор" : /парламентарен контрол/i.test(t) ? "контрол" : /решение/i.test(t) ? "решение" : "друго";
  const paren = t.match(/\((Вносител[и]?:[^)]*)\)/);
  const sponsors = paren?.[1].replace(/^Вносител[и]?:\s*/, "").replace(/;\s*Приет на първо гласуване.*$/, "").trim();
  const firstReading = t.match(/Приет на първо гласуване на ([\d.]+ г\.)/)?.[1];
  const day = t.match(/точка [а-я]+ за ([а-я]+,\s*\d+\s*[а-я]+)/i)?.[0];
  let title = t.replace(/\s*\(Вносител[\s\S]*$/, "").replace(/\s*-\s*точка [\s\S]*$/, "").replace(/^(Първо|Второ) гласуване на /i, "").replace(/\.$/, "");
  title = title.charAt(0).toUpperCase() + title.slice(1);
  const law = lawFromTitle(title.replace(/^законопроекти/i, "Законопроект"));
  const slug = law && lawSlugs.has(law.slug) ? law.slug : undefined;
  return { n: p.n, stage, title, sponsors, firstReading, day, slug, analysed: !!(slug && LAWS[slug]), acts: p.acts, text: t };
}

export const billUrl = (id: number) => `https://www.parliament.bg/bg/bills/ID/${id}`;
