"use client";
import { useEffect, useState } from "react";

type Feed = { file: string; label: string; every: string; maxHours: number };
type Run = { status: string; conclusion: string | null; created_at: string; html_url: string };
type Row = { last?: Run; lastOk?: Run; error?: boolean; now?: number };

const API = "https://api.github.com/repos/osaznatost/osaznatost-web/actions/workflows";
const ago = (iso: string, now: number) => {
  const h = (now - new Date(iso).getTime()) / 36e5;
  return h < 1 ? "преди по-малко от час" : h < 48 ? `преди ${Math.round(h)} ч.` : `преди ${Math.round(h / 24)} дни`;
};
const when = (iso: string) => new Date(iso).toLocaleString("bg-BG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Живо състояние на автоматичните обновявания, направо от GitHub Actions (публични данни). */
export function Status({ feeds }: { feeds: Feed[] }) {
  const [rows, setRows] = useState<Record<string, Row>>({});
  useEffect(() => {
    let off = false;
    for (const f of feeds) {
      fetch(`${API}/${f.file}/runs?per_page=15`, { headers: { Accept: "application/vnd.github+json" } })
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((j: { workflow_runs: Run[] }) => {
          if (off) return;
          const runs = j.workflow_runs ?? [];
          setRows((p) => ({ ...p, [f.file]: { last: runs[0], lastOk: runs.find((x) => x.conclusion === "success"), now: Date.now() } }));
        })
        .catch(() => !off && setRows((p) => ({ ...p, [f.file]: { error: true } })));
    }
    return () => { off = true; };
  }, [feeds]);

  return (
    <ul className="space-y-3">
      {feeds.map((f) => {
        const r = rows[f.file];
        const okAge = r?.lastOk && r.now ? (r.now - new Date(r.lastOk.created_at).getTime()) / 36e5 : Infinity;
        const state = !r ? "load" : r.error ? "unknown" : okAge <= f.maxHours ? "ok" : "late";
        const badge = {
          load: ["Проверява се…", "bg-surface text-muted"],
          unknown: ["Няма връзка с GitHub", "bg-surface text-muted"],
          ok: ["Обновено навреме", "bg-[#d7ecd9] text-[#1f5c2a]"],
          late: ["Закъснява", "bg-[#fdeff1] text-red"],
        }[state];
        return (
          <li key={f.file} className="ring-1 ring-rule rounded-sm bg-white p-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 ${badge[1]}`}>{badge[0]}</span>
              <span className="font-semibold">{f.label}</span>
              <span className="text-sm text-muted">{f.every}</span>
            </div>
            {r?.lastOk && <p className="text-[15px] mt-1">Последно успешно: {when(r.lastOk.created_at)} ({ago(r.lastOk.created_at, r.now ?? 0)}). <a href={r.lastOk.html_url} target="_blank" rel="noreferrer">Подробности</a></p>}
            {r?.last && r.last.conclusion && r.last.conclusion !== "success" && <p className="text-[15px] text-red">Последният опит ({when(r.last.created_at)}) не успя. Следващият е по график.</p>}
            {r?.last && !r.last.conclusion && <p className="text-[15px] text-muted">В момента тече обновяване.</p>}
          </li>
        );
      })}
    </ul>
  );
}
