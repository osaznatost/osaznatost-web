import type { PartyCount, VoteCode } from "@/lib/parliament";
import { MPS, PARTIES, partyName, type Vote } from "@/lib/parliament";

// Цветовете на таблото в пленарната зала: зелено „за“, червено „против“, жълто „въздържал се“.
export const VOTE_COLOR: Record<VoteCode, string> = { y: "#2f9e6a", n: "#d2353f", a: "#e2b33b", x: "#cfd8d2", "-": "#ffffff" };

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
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: k === "x" ? "transparent" : VOTE_COLOR[k], boxShadow: k === "x" ? "inset 0 0 0 1.5px #c3cdc6" : undefined }} /> {l}
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

/** Табло като в пленарната зала: всеки депутат е точка, редовете са групите. */
export function VoteBoard({ vote, dark = false, size = 11 }: { vote: Vote; dark?: boolean; size?: number }) {
  const rows = PARTIES.map((p) => ({
    p,
    seats: MPS.map((m, i) => ({ m, c: vote.v[i] as VoteCode })).filter(({ m, c }) => m.party === p && c !== "-")
      .sort((a, b) => "ynax".indexOf(a.c) - "ynax".indexOf(b.c)),
  })).filter((r) => r.seats.length);
  let n = 0;
  return (
    <div className="space-y-2.5" role="img" aria-label={`За ${vote.tally.yes}, против ${vote.tally.no}, въздържали се ${vote.tally.abstain}, отсъстващи ${vote.tally.absent}`}>
      {rows.map((r) => (
        <div key={r.p} className="grid grid-cols-[7.5rem_1fr] sm:grid-cols-[10rem_1fr] gap-3 items-start">
          <span className={`text-[13px] leading-tight pt-px ${dark ? "text-white/80" : "text-muted"}`}>{partyName(r.p)}</span>
          <span className="flex flex-wrap gap-[3px]">
            {r.seats.map(({ m, c }) => (
              <span
                key={m.id}
                title={`${m.name}: ${({ y: "за", n: "против", a: "въздържал се", x: "отсъства", "-": "" } as const)[c]}`}
                className="board-dot inline-block rounded-full"
                style={{
                  width: size, height: size,
                  background: c === "x" ? "transparent" : VOTE_COLOR[c],
                  boxShadow: c === "x" ? `inset 0 0 0 1.5px ${dark ? "rgba(255,255,255,.28)" : "#c3cdc6"}` : undefined,
                  animationDelay: `${Math.min(n++ * 3, 700)}ms`,
                }}
              />
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}
