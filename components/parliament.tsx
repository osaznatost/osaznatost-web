import type { PartyCount, VoteCode } from "@/lib/parliament";
import { partyName } from "@/lib/parliament";

// Неутрални цветове за видовете глас (не за партии)
export const VOTE_COLOR: Record<VoteCode, string> = { y: "#2a7f7a", n: "#b0413e", a: "#b08436", x: "#d5d9d6", "-": "#ffffff" };

export function TallyBar({ c, height = 10 }: { c: PartyCount; height?: number }) {
  const total = c.y + c.n + c.a + c.x || 1;
  return (
    <div className="flex w-full overflow-hidden rounded-sm" style={{ height }} aria-hidden>
      {(["y", "n", "a", "x"] as const).map((k) =>
        c[k] ? <div key={k} style={{ width: `${(c[k] / total) * 100}%`, background: VOTE_COLOR[k] }} /> : null,
      )}
    </div>
  );
}

export function VoteLegend() {
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {([["y", "За"], ["n", "Против"], ["a", "Въздържал се"], ["x", "Отсъства"]] as const).map(([k, l]) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: VOTE_COLOR[k] }} /> {l}
        </span>
      ))}
    </p>
  );
}

export function OutcomeTag({ outcome }: { outcome: string }) {
  const rejected = outcome === "rejected";
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-sm ${rejected ? "bg-surface text-muted border border-rule" : "bg-green-soft text-green"}`}>
      {rejected ? "Отхвърлено" : outcome === "passed_unanimous" ? "Прието единодушно" : "Прието"}
    </span>
  );
}

export function PartyLabel({ p }: { p: string }) {
  return <span title={partyName(p)}>{partyName(p)}</span>;
}
