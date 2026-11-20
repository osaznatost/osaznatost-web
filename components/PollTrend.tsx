import T from "@/data/polls-trend.json";

type Poll = { date: string; agency: string; support: Record<string, number> };
const POLLS = (T as unknown as { polls: Poll[] }).polls.filter((p) => p.date >= "2021-01-01");
// Сериите: някои партии се явяват ту заедно, ту поотделно, затова ги събираме по правило, описано под графиката.
const SERIES: { key: string; label: string; color: string; get: (s: Record<string, number>) => number | undefined }[] = [
  { key: "pb", label: "Прогресивна България", color: "#2f6f8f", get: (s) => s["Прогресивна България"] },
  { key: "gerb", label: "ГЕРБ", color: "#2b5fa8", get: (s) => s["ГЕРБ"] },
  { key: "ppdb", label: "ПП и ДБ", color: "#d18a1c", get: (s) => s["ПП–ДБ"] ?? (s["ПП"] !== undefined || s["ДБ"] !== undefined ? (s["ПП"] ?? 0) + (s["ДБ"] ?? 0) : undefined) },
  { key: "dps", label: "ДПС / ДПС–НН", color: "#7a4fa0", get: (s) => s["ДПС–НН"] ?? s["ДПС"] },
  { key: "vaz", label: "Възраждане", color: "#3f7d3a", get: (s) => s["Възраждане"] },
  { key: "bsp", label: "БСП", color: "#c0392b", get: (s) => s["БСП"] },
  { key: "itn", label: "ИТН", color: "#555", get: (s) => s["ИТН"] },
];
const W = 760, H = 300, L = 34, R = 10, TOP = 10, B = 26;

export function PollTrend() {
  if (!POLLS.length) return null;
  const t0 = Date.parse(POLLS[0].date), t1 = Date.parse(POLLS.at(-1)!.date);
  const ymax = 45;
  const x = (d: string) => L + ((Date.parse(d) - t0) / (t1 - t0)) * (W - L - R);
  const y = (v: number) => TOP + (1 - v / ymax) * (H - TOP - B);
  const years = Array.from({ length: Number(POLLS.at(-1)!.date.slice(0, 4)) - Number(POLLS[0].date.slice(0, 4)) + 1 }, (_, i) => Number(POLLS[0].date.slice(0, 4)) + i);
  const last = POLLS.at(-1)!;
  return (
    <figure className="max-w-4xl">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Подкрепа за партиите в проучванията от 2021 г.">
        {[0, 10, 20, 30, 40].map((v) => <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#e3e6e4" /><text x={L - 6} y={y(v) + 4} fontSize="11" textAnchor="end" fill="#6b746f">{v}%</text></g>)}
        {years.map((yr) => { const xx = x(`${yr}-01-01`); return xx >= L ? <text key={yr} x={xx} y={H - 6} fontSize="11" fill="#6b746f">{yr}</text> : null; })}
        {SERIES.map((s) => {
          const pts = POLLS.map((p) => ({ d: p.date, v: s.get(p.support) })).filter((p): p is { d: string; v: number } => p.v !== undefined);
          if (pts.length < 2) return null;
          return (
            <g key={s.key}>
              <polyline fill="none" stroke={s.color} strokeWidth="1.6" strokeOpacity="0.85" points={pts.map((p) => `${x(p.d).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ")} />
              {pts.map((p, i) => <circle key={i} cx={x(p.d)} cy={y(p.v)} r="2" fill={s.color}><title>{`${s.label}: ${Math.round(p.v * 10) / 10}% (${p.d})`}</title></circle>)}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">{SERIES.map((s) => {
          const v = s.get(last.support);
          return <li key={s.key}><span className="inline-block w-3 h-3 rounded-sm mr-1 align-middle" style={{ background: s.color }} />{s.label}{v !== undefined ? <b className="num"> {v.toLocaleString("bg-BG", { maximumFractionDigits: 1 })}%</b> : null}</li>;
        })}</ul>
        <p className="text-xs text-muted mt-2">
          {POLLS.length} проучвания от {POLLS[0].date.split("-").reverse().join(".")} до {last.date.split("-").reverse().join(".")} (последното: {last.agency}). Всяка точка е едно проучване; процентът е от посочилите партия, както го публикува агенцията.
          „ПП и ДБ“ е общата листа, а когато партиите са измервани поотделно, сборът им. „ДПС“ след разцеплението през 2024 г. е ДПС–Ново начало; АПС не е показана. Източник: публикуваните проучвания на агенциите, събрани от „Наясно“.
        </p>
      </figcaption>
    </figure>
  );
}
