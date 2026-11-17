import raw from "@/content/laws.json";

export type Source = { title: string; url: string };
/** src е номер на източник от `sources` (от 1). Всеки аргумент има източник. */
export type Argument = { who: string; text: string; src: number[] };
export type DataPoint = { text: string; src: number[] };
export type Impact = { group: string; gains: string; loses: string; src: number[] };

export type Outcome = { good: string[]; bad: string[] };
export type Effects = { ifPassed: Outcome; ifRejected: Outcome; src: number[] };

export type LawContent = {
  name: string; status?: string; bill?: { sign: string; url: string }; sponsors?: string;
  summary: string; whatHappened?: string;
  motives?: Argument[];
  critics?: Argument[];
  data?: DataPoint[];
  impact?: Impact[];
  effects?: Effects;
  paragraphs?: Record<string, string>;
  checks?: { claim: string; verdict: string; why: string }[];
  sources: Source[]; reviewed: string; note?: string;
};
export const LAWS = raw as unknown as Record<string, LawContent>;
export const getLaw = (slug?: string) => (slug ? LAWS[slug] : undefined);
