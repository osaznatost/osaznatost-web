"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type VoteRow = {
  id: string; date: string; title: string; topic: string; outcome: string;
  yes: number; no: number; abstain: number;
  pos: Record<string, string>;
};

const POS: Record<string, string> = { y: "За", n: "Против", a: "Въздържал се", split: "Разделени", absent: "Отсъства" };
const PAGE = 20;

export function VoteList({ rows, parties, topics }: { rows: VoteRow[]; parties: { id: string; name: string }[]; topics: Record<string, string> }) {
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState("");
  const [outcome, setOutcome] = useState("");
  const [party, setParty] = useState("");
  const [partyPos, setPartyPos] = useState("");
  const [shown, setShown] = useState(PAGE);

  const filtered = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return rows.filter((r) => {
      if (topic && r.topic !== topic) return false;
      if (outcome === "passed" && r.outcome === "rejected") return false;
      if (outcome === "rejected" && r.outcome !== "rejected") return false;
      if (party && partyPos && r.pos[party] !== partyPos) return false;
      const t = r.title.toLowerCase();
      return words.every((w) => t.includes(w));
    });
  }, [rows, q, topic, outcome, party, partyPos]);

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <input type="text" placeholder="Търсене: закон, тема, дума…" value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE); }} aria-label="Търсене" />
        <select value={topic} onChange={(e) => { setTopic(e.target.value); setShown(PAGE); }} aria-label="Тема">
          <option value="">Всички теми</option>
          {Object.entries(topics).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select value={outcome} onChange={(e) => { setOutcome(e.target.value); setShown(PAGE); }} aria-label="Резултат">
          <option value="">Прието и отхвърлено</option>
          <option value="passed">Само прието</option>
          <option value="rejected">Само отхвърлено</option>
        </select>
        <div className="flex gap-2">
          <select value={party} onChange={(e) => { setParty(e.target.value); setShown(PAGE); }} aria-label="Група">
            <option value="">Как гласува група…</option>
            {parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {party && (
            <select value={partyPos} onChange={(e) => { setPartyPos(e.target.value); setShown(PAGE); }} aria-label="Позиция">
              <option value="">всяко</option>
              <option value="y">За</option>
              <option value="n">Против</option>
              <option value="a">Въздържал се</option>
              <option value="split">Разделени</option>
            </select>
          )}
        </div>
      </div>
      <p className="text-sm text-muted mb-2">{filtered.length} гласувания</p>
      <ul>
        {filtered.slice(0, shown).map((r) => (
          <li key={r.id} className="border-b border-rule py-3 grid gap-1 sm:grid-cols-[7rem_1fr_auto] sm:gap-4 sm:items-baseline">
            <span className="text-sm text-muted num">{new Date(r.date).toLocaleDateString("bg-BG")}</span>
            <span>
              <Link href={`/parlament/glasuvane/${r.id}`} className="text-ink no-underline hover:underline">{r.title}</Link>
              {party && r.pos[party] && <span className="text-sm text-muted"> · {parties.find((p) => p.id === party)?.name}: {POS[r.pos[party]]}</span>}
            </span>
            <span className="text-sm num whitespace-nowrap">
              <span className={r.outcome === "rejected" ? "text-muted" : "text-green font-semibold"}>{r.outcome === "rejected" ? "Отхвърлено" : "Прието"}</span>
              <span className="text-muted"> · {r.yes}/{r.no}/{r.abstain}</span>
            </span>
          </li>
        ))}
      </ul>
      {shown < filtered.length && (
        <button type="button" onClick={() => setShown(shown + PAGE)} className="mt-4 border border-rule px-4 py-2 rounded hover:border-ink">
          Покажи още ({filtered.length - shown})
        </button>
      )}
      <p className="text-xs text-muted mt-3">Числата след резултата са За / Против / Въздържал се.</p>
    </div>
  );
}
