// Български фирми в санкционните списъци (OpenSanctions, CC BY-NC 4.0) — само по ЕИК (scripts/import-sanctions.mjs).
import { data } from "@/lib/data";

export type Sanction = { name: string; programs: string[]; sources: string[]; id: string; since: string | null };
type File = { updated: string; firms: Record<string, Sanction> };
const file = () => data<File>("proc/sanctions.json");
export async function sanction(eik: string): Promise<(Sanction & { updated: string }) | null> {
  const f = await file().catch(() => null);
  const e = (eik ?? "").replace(/\D/g, "");
  const s = f?.firms[e] ?? f?.firms[e.slice(0, 9)];
  return s ? { ...s, updated: f!.updated } : null;
}
export async function sanctionsMany(eiks: string[]) {
  const f = await file().catch(() => null);
  const out = new Map<string, Sanction>();
  for (const e of new Set(eiks)) { const s = f?.firms[e] ?? f?.firms[e.slice(0, 9)]; if (s) out.set(e, s); }
  return out;
}
/** Кратко име на програмата за санкции на български. */
export function programBg(p: string) {
  if (/13818|magnitsky|GLOMAG/i.test(p)) return "САЩ, закон „Магнитски“ (корупция)";
  if (/14024|russia/i.test(p)) return "санкции заради Русия";
  if (/EU|European/i.test(p)) return "санкции на ЕС";
  if (/UK|HMT|OFSI/i.test(p)) return "санкции на Великобритания";
  return p.split(" - ")[0];
}
