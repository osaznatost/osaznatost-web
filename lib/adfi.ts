// Доклади от финансови инспекции на АДФИ (data/adfi.json, scripts/import-adfi.mjs).
import { data } from "@/lib/data";

export type AdfiReport = { url: string; no: string; object: string; updated: boolean; basis: string; date: string | null; muni: string | null; self: boolean };
export const adfiFile = () => data<{ updated: string; source: string; items: AdfiReport[] }>("adfi.json");
export async function adfiOfMuni(code: string) {
  return ((await adfiFile())?.items ?? []).filter((x) => x.muni === code);
}
