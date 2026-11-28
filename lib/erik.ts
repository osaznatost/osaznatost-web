// Дарения за предизборните кампании (ЕРИК, Сметната палата). Данните: data/erik/donations.json (scripts/import-erik.mjs).
import { data } from "@/lib/data";

export type ErikPart = { name: string; eur: number; n: number; money: number; inKind: number; big: [string, number, string, string, number][] };
export type ErikElection = { id: number; name: string; total: number; n: number; participants: ErikPart[] };
export type Erik = { source: string; fetched: string; bigFrom: number; elections: ErikElection[] };

export const erik = async () => (await data<Erik>("erik/donations.json")) ?? null;
const key = (s: string) => s.toUpperCase().replace(/Ё/g, "Е").replace(/[^А-ЯA-Z0-9]/g, "");

/** Участниците в изборите, които отговарят на партията (по името на листата или на партията). */
export async function erikForParty(names: string[]) {
  const E = await erik();
  if (!E) return null;
  const ks = names.filter(Boolean).map(key).filter((k) => k.length >= 3);
  const rows: { election: ErikElection; part: ErikPart }[] = [];
  for (const el of E.elections) for (const p of el.participants) {
    if (/Местна коалиция|Инициативен комитет|, община /i.test(p.name)) continue; // местните листи не са на националната партия
    const k = key(p.name);
    if (ks.some((x) => k === x || k.includes(x) || k === `КП${x}` || k === `ПП${x}`)) rows.push({ election: el, part: p });
  }
  return { E, rows };
}
