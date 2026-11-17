import raw from "@/content/sanctions.json";

export type Measure = { regime: "GLOMAG" | "7031c" | "UKGAC"; date: string; status: string; url: string };
export type Sanctioned = { name: string; role: string; party: string | null; measures: Measure[]; allegation: string; bg?: string; bgUrl?: string };
export const SANCTIONS = raw as { updated: string; note: string; regimes: Record<string, { name: string; effect: string }>; people: Sanctioned[] };
const norm = (s: string) => s.toUpperCase().replace(/\s+/g, " ").trim();
/** Санкции за даден човек по пълно име. */
export const sanctionsFor = (name: string) => SANCTIONS.people.find((p) => norm(p.name) === norm(name));
