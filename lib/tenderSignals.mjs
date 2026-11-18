// Сигнали от обявленията (data/tender-signals, от scripts/import-ocds-signals.mjs): срок за оферти и промени в условията.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "data", "tender-signals");
const shards = new Map();
/** [дни за оферти, [дати на промени], ЕС 0/1, метод] за поръчка по номер, или null. */
export function tenderSignal(tid) {
  if (tid == null || !/^\d+$/.test(String(tid))) return null;
  const k = String(Number(tid) % 100).padStart(2, "0");
  if (!shards.has(k)) { const f = path.join(DIR, `${k}.json`); shards.set(k, existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : {}); }
  return shards.get(k)[String(tid)] ?? null;
}
/** Флаговете по сигналите: [id, точки, обяснение]. Праговете са по-ниски от законовите минимуми, за да хващат само ясните случаи. */
export function signalFlags(s) {
  if (!s) return [];
  const [days, changes, eu, method] = s, out = [];
  const open = method === "open" || method === "selective";
  if (days != null && days >= 1 && open) {
    if (eu && days < 20) out.push(["short", 8, `Само ${days} дни за оферти при процедура по европейските правила (обичайният минимум е 30 дни, 15 при спешност).`]);
    else if (!eu && days < 10) out.push(["short", 10, `Само ${days} дни за оферти (за публично състезание законът изисква поне 20 дни, а при спешност поне 10).`]);
  }
  if ((changes?.length ?? 0) >= 2) out.push(["changes", 5, `Условията на процедурата са променяни ${changes.length} пъти.`]);
  return out;
}
