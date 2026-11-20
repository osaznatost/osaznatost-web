import PREV from "@/data/parliament-prev.json";

export type PrevVote = { id: string; date: string; title: string; outcome: string; first: boolean; g: Record<string, [number, number, number]> };
export type PrevNs = { from: string; to: string; total: number; mps: { name: string; party: string; present: number | null }[]; votes: PrevVote[] };
export const PREV_NS = (PREV as unknown as { ns: Record<string, PrevNs> }).ns;
export const PREV_SOURCE = (PREV as { source: string }).source;
export const PREV_LIST = Object.keys(PREV_NS).sort((a, b) => Number(b) - Number(a));

const norm = (s: string) => s.toUpperCase().replace(/\s+/g, " ").trim();
const byName = new Map<string, { ns: string; party: string }[]>();
for (const n of Object.keys(PREV_NS).sort()) for (const m of PREV_NS[n].mps) {
  const k = norm(m.name);
  byName.set(k, [...(byName.get(k) ?? []), { ns: n, party: m.party }]);
}
/** В кои от предишните парламенти (49–51) е бил човекът и в коя група (последната известна в този парламент). */
export const prevPartiesOf = (name: string) => byName.get(norm(name)) ?? [];

/** Позиция на групата: мнозинството от гласувалите в нея. */
export function groupPos([y, n, a]: [number, number, number]): "y" | "n" | "a" | "split" {
  const m = Math.max(y, n, a);
  const w = (["y", "n", "a"] as const).filter((k, i) => [y, n, a][i] === m);
  return w.length > 1 ? "split" : w[0];
}
export const POS_LABEL = { y: "за", n: "против", a: "въздържал се", split: "разделени" } as const;
