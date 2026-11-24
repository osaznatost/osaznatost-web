// Одитните доклади на Сметната палата (data/audits.json, scripts/import-bulnao.mjs).
import { data } from "@/lib/data";

export type Audit = { id: string; url: string; title: string; cat: string; type: string; year: number; kind: string; munis: string[] };
type File = { updated: string; source: string; items: Audit[] };

export const auditsFile = () => data<File>("audits.json");
export async function auditsOfMuni(code: string): Promise<Audit[]> {
  return ((await auditsFile())?.items ?? []).filter((a) => a.munis.includes(code));
}
/** Доклади, в чието заглавие е името на институцията (напр. „Министерството на отбраната“). */
export async function auditsMentioning(name: string): Promise<Audit[]> {
  const core = name.replace(/^Министерство(то)? на\s+/i, "").trim().toLowerCase();
  if (core.length < 6) return [];
  return ((await auditsFile())?.items ?? []).filter((a) => { const t = a.title.toLowerCase(); return t.includes(`министерството на ${core}`) || t.includes(`министерство на ${core}`); });
}
/** „Одитен доклад за извършен одит за съответствие при …“ → „Одит за съответствие при …“ */
export const auditTitle = (t: string) => t.replace(/^Одитен доклад (на Сметната палата )?(№\s*\S+\s+)?за извършен(ия)?\s+/i, "").replace(/^\S/, (c) => c.toUpperCase());
