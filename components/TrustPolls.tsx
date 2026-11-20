import T from "@/content/trust.json";

type Item = { who: string; kind: string; role?: string; trust: number; distrust?: number; q?: string };
type Poll = { agency: string; field: string; date: string; n: number; method: string; items: Item[]; source: string };
const D = T as { about: string; polls: Poll[] };
const p = (v: number) => v.toLocaleString("bg-BG", { maximumFractionDigits: 1 }) + "%";

/** Доверие в лидерите и институциите: числата от публикуваните проучвания, по агенции, с източник. */
export function TrustPolls() {
  const polls = [...D.polls].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div>
      <p className="text-[15px] text-muted mb-4 max-w-3xl">{D.about} Показваме само проценти, които агенцията или медията е публикувала изрично; където няма число за някого, той не е в таблицата.</p>
      <div className="space-y-5">
        {polls.map((x) => (
          <div key={x.agency + x.date} className="border-t border-rule pt-3">
            <h3 className="font-semibold">{x.agency}, {x.field}</h3>
            <p className="text-xs text-muted mb-2">{x.n.toLocaleString("bg-BG")} пълнолетни, {x.method}. <a className="underline" href={x.source}>Източник</a></p>
            <ul className="space-y-1.5 max-w-3xl">
              {x.items.map((i) => (
                <li key={i.who} className="text-[15px]">
                  <div className="flex justify-between gap-3">
                    <span>{i.who}{i.role && <span className="text-muted"> ({i.role})</span>}</span>
                    <span className="num">{p(i.trust)}{i.distrust !== undefined && <span className="text-muted"> · недоверие {p(i.distrust)}</span>}{i.q && <span className="text-xs text-muted"> ({i.q})</span>}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface mt-1"><div className="h-full rounded-full bg-ink/60" style={{ width: `${Math.min(100, i.trust)}%` }} /></div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
