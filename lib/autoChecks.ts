// Автоматична сверка на числата от изказванията в парламента с официалните данни (data/checks-auto.json).
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type AutoCheck = {
  id: string; ind: string; indicator: string; value: number; unit: string; date: string; who: string; group: string | null;
  text: string; url: string; official: number; period: string; source: string; verdict: "match" | "close" | "off"; diff: number; all: [string, number][];
};
let cache: { updated: string; checks: AutoCheck[] } | null = null;
export function autoChecks() {
  if (!cache) { const f = path.join(process.cwd(), "data", "checks-auto.json"); cache = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : { updated: "", checks: [] }; }
  return cache!;
}
export const VERDICT = {
  match: { label: "Съвпада", cls: "bg-[#d7ecd9] text-[#1f5c2a]" },
  close: { label: "Близо", cls: "bg-[#fdf3e6] text-[#8a4b0f]" },
  off: { label: "Разминава се", cls: "bg-[#fdeff1] text-red" },
} as const;
const key = (n: string) => { const p = n.trim().toLowerCase().split(/\s+/); return `${p[0]} ${p.at(-1)}`; };
export function autoChecksFor(fullName: string) {
  const k = key(fullName);
  return autoChecks().checks.filter((c) => key(c.who) === k);
}
