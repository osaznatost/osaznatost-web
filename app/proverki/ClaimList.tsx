"use client";
import { useMemo, useState } from "react";

export function ClaimFilter({ items, verdicts, people, children }: {
  items: { id: string; verdict: string; who: string; topic: string }[];
  verdicts: string[]; people: string[]; children: React.ReactNode[];
}) {
  const [v, setV] = useState<string | null>(null);
  const [p, setP] = useState<string>("");
  const visible = useMemo(() => new Set(items.filter((c) => (!v || c.verdict === v) && (!p || c.who === p)).map((c) => c.id)), [items, v, p]);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button onClick={() => setV(null)} className={`text-sm rounded-full px-3 py-1 ring-1 ${!v ? "bg-green text-white ring-green" : "ring-rule"}`}>Всички присъди</button>
        {verdicts.map((x) => (
          <button key={x} onClick={() => setV(v === x ? null : x)} className={`text-sm rounded-full px-3 py-1 ring-1 ${v === x ? "bg-green text-white ring-green" : "ring-rule"}`}>{x} <span className="opacity-60">{items.filter((c) => c.verdict === x).length}</span></button>
        ))}
        <select value={p} onChange={(e) => setP(e.target.value)} className="text-sm ring-1 ring-rule rounded-sm px-2 py-1 sm:ml-auto w-full sm:w-auto" aria-label="Кой го е казал">
          <option value="">Всички хора</option>
          {people.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </div>
      <p className="text-sm text-muted mb-3">{visible.size} от {items.length} твърдения</p>
      <div className="grid gap-3">{items.map((c, i) => (visible.has(c.id) ? <div key={c.id}>{children[i]}</div> : null))}</div>
    </div>
  );
}
