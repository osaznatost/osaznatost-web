// Сигналите за една или няколко фирми (за нощното обобщение, което показва значките в списъците).
// GET /api/firm-signals?eik=123,456 → { "123": { n, high, kinds: ["officials:2:high", …] } }
import { firmSignals } from "@/lib/firmSignals";

export async function GET(req: Request) {
  const eiks = (new URL(req.url).searchParams.get("eik") ?? "").split(",").map((x) => x.trim()).filter((x) => /^\d{9,13}$/.test(x)).slice(0, 5);
  const out: Record<string, { n: number; high: number; kinds: string[] } | null> = {};
  for (const e of eiks) {
    try {
      const r = await firmSignals(e);
      out[e] = { n: r.sigs.length, high: r.sigs.filter((s) => s.level === "high").length, kinds: r.sigs.map((s) => `${s.kind}:${s.n}:${s.level}`) };
    } catch { out[e] = null; }
  }
  return Response.json(out, { headers: { "Cache-Control": "no-store" } });
}
