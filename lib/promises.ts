import raw from "@/content/promises.json";

export type Status = "kept" | "in_progress" | "at_risk" | "not_met" | "broken" | "not_assessed" | "done" | "partly" | "failed";
export type Promise_ = {
  text: string; area: string; said: { who: string; when: string; url: string }; status: Status;
  evidence: string; links: { title: string; url: string }[];
  timeline?: { date: string; what: string; url?: string }[];
  why?: string[]; whySrc?: string[]; next?: string; note?: string;
};
export type Gov = { party: string; name: string; term: "current" | "past"; period: string; role: string; programme: { title: string; url: string }[]; promises: Promise_[] };
export const data = raw as { updated: string; parties: Gov[] };

export const STATUS: Record<Status, { label: string; color: string; text: string }> = {
  kept: { label: "Спазено досега", color: "#2f9e6a", text: "#fff" },
  in_progress: { label: "В процес", color: "#e2b33b", text: "#16201b" },
  at_risk: { label: "Под въпрос", color: "#e08a2e", text: "#16201b" },
  not_met: { label: "Засега не е изпълнено", color: "#d2353f", text: "#fff" },
  broken: { label: "Нарушено", color: "#7a1e26", text: "#fff" },
  not_assessed: { label: "Още не е проверено", color: "#cfd8d2", text: "#16201b" },
  done: { label: "Изпълнено", color: "#2f9e6a", text: "#fff" },
  partly: { label: "Частично изпълнено", color: "#e2b33b", text: "#16201b" },
  failed: { label: "Не е изпълнено", color: "#d2353f", text: "#fff" },
};
export const ORDER: Status[] = ["done", "kept", "partly", "in_progress", "at_risk", "not_met", "failed", "broken", "not_assessed"];
export const GOOD: Status[] = ["done", "kept"];
export const BAD: Status[] = ["not_met", "failed", "broken"];

const SLUG: Record<string, string> = { "ПБ": "radev", "GOV-ZH": "zhelyazkov", "GOV-DK": "denkov", "GOV-PK": "petkov", "GOV-B3": "borisov-3", "GOV-OR": "oresharski", "GOV-B2": "borisov-2" };
export const govSlug = (g: Gov) => SLUG[g.party] ?? g.party.toLowerCase();
export const findGov = (slug: string) => data.parties.find((g) => govSlug(g) === slug);
