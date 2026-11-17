import raw from "@/content/sanctions.json";

export type Measure = { regime: "GLOMAG" | "7031c" | "UKGAC"; date: string; status: string; url: string };
export type Sanctioned = { name: string; role: string; party: string | null; measures: Measure[]; allegation: string; bg?: string; bgUrl?: string };
export const SANCTIONS = raw as { updated: string; note: string; regimes: Record<string, { name: string; effect: string }>; people: Sanctioned[] };
const norm = (s: string) => s.toUpperCase().replace(/\s+/g, " ").trim();
/** Санкции за даден човек по пълно име. */
export const sanctionsFor = (name: string) => SANCTIONS.people.find((p) => norm(p.name) === norm(name));
import cases from "@/content/cases.json";
/** Обвинения и присъди за човек: съвпадение по първо и последно име. */
export function casesFor(name: string) {
  const w = name.toUpperCase().split(/\s+/);
  return cases.cases.filter((c) => { const v = c.person.toUpperCase().split(/\s+/); return v[0] === w[0] && v.at(-1) === w.at(-1); })
    .map((c) => ({ ...c, levelLabel: cases.levels[c.level as keyof typeof cases.levels].label }));
}
