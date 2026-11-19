// Автоматично извлечени цитати от документите на парламента (data/laws-auto.json, от scripts/build-law-auto.mjs).
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type AutoLaw = {
  id: number; sign: string; title: string; url: string;
  change: string[]; positions: string[]; critics: string[]; support: string[];
  hall: { who: string; group: string | null; text: string; date: string; stage: string; url: string }[];
  opinions: string[];
};
let cache: Record<string, AutoLaw> | null = null;
export function autoFor(billId: number): AutoLaw | null {
  if (!cache) { const f = path.join(process.cwd(), "data", "laws-auto.json"); cache = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : {}; }
  return cache![String(billId)] ?? null;
}
