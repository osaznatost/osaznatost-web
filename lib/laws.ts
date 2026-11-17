import raw from "@/content/laws.json";

export type LawContent = {
  name: string; status?: string; bill?: { sign: string; url: string }; sponsors?: string;
  summary: string; whatHappened?: string; sides?: { who: string; argument: string }[];
  paragraphs?: Record<string, string>; sources: { title: string; url: string }[]; reviewed: string; note?: string;
};
export const LAWS = raw as Record<string, LawContent>;
export const getLaw = (slug?: string) => (slug ? LAWS[slug] : undefined);
