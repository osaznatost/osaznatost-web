// Сигналите от обявленията за сайта (през lib/data, работи и в Cloudflare). Скриптовете ползват lib/tenderSignals.mjs.
import { data } from "@/lib/data";
export { signalFlags } from "@/lib/tenderSignals.mjs";
/** [дни за оферти, [дати на промени], ЕС 0/1, метод] за поръчка по номер, или null. */
export async function tenderSignal(tid: string | number | null | undefined) {
  if (tid == null || !/^\d+$/.test(String(tid))) return null;
  const k = String(Number(tid) % 100).padStart(2, "0");
  return ((await data<Record<string, unknown>>(`tender-signals/${k}.json`))?.[String(tid)] ?? null) as [number | null, string[], number, string] | null;
}
