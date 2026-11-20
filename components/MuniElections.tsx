import LE from "@/data/local-elections.json";

type C = { name: string; party: string; votes: number; pct: number; ind: boolean };
type Y = { registered: number | null; voted: number | null; valid: number | null; mayor: C | null; round: number | null; round1: C[]; round2: C[]; council: { party: string; votes: number; pct: number; seats: number }[]; seats: number };
const D = LE as unknown as { byCode: Record<string, Record<string, Y>>; source: string; url: string; cycles: number[] };
const pct = (v: number) => v.toLocaleString("bg-BG", { maximumFractionDigits: 1 }) + "%";
const who = (c: C) => (c.ind ? "независим, " : "") + c.party;

/** Кой е избран за кмет и как е разпределен общинският съвет на всеки местни избори от 2011 г. насам. */
export function MuniElections({ code }: { code: string }) {
  const d = D.byCode[code];
  if (!d) return null;
  const years = Object.keys(d).sort().reverse();
  return (
    <section id="mestni-izbori" className="mb-12 scroll-mt-32 lg:scroll-mt-20">
      <h2 className="text-xl font-bold mb-1">Местни избори</h2>
      <p className="text-[15px] text-muted mb-4 max-w-3xl">Резултатите на ЦИК за кмет на общината и за общински съвет. Партиите са с имената, с които са регистрирани в съответните избори. Кметът е избран на първи тур, ако вземе над половината гласове, иначе на балотаж.</p>
      <div className="space-y-6">
        {years.map((y) => {
          const x = d[y];
          const turnout = x.registered && x.voted ? (x.voted / x.registered) * 100 : null;
          const rival = x.round === 2 ? x.round2.find((c) => c.name !== x.mayor?.name) : x.round1.find((c) => c.name !== x.mayor?.name);
          return (
            <div key={y} className="border-t border-rule pt-3">
              <h3 className="font-semibold mb-1">{y} г.{turnout !== null && <span className="font-normal text-muted text-[15px]"> · гласували {pct(turnout)}</span>}</h3>
              {x.mayor ? (
                <p className="text-[15px] mb-2">
                  Кмет: <strong>{x.mayor.name}</strong> ({who(x.mayor)}), {pct(x.mayor.pct)} {x.round === 2 ? "на балотажа" : "на първия тур"}
                  {rival && <span className="text-muted">. Следващ: {rival.name} ({who(rival)}), {pct(rival.pct)}</span>}.
                </p>
              ) : <p className="text-[15px] text-muted mb-2">Няма данни за кмета.</p>}
              {x.council.length > 0 && (
                <div className="overflow-x-auto">
                  <table data-nostack className="w-full text-[15px] border-collapse">
                    <thead><tr className="text-left border-b border-rule"><th className="py-1 pr-3">Общински съвет ({x.seats} съветници)</th><th className="py-1 px-2 num">Гласове</th><th className="py-1 pl-2 num">Места</th></tr></thead>
                    <tbody>{x.council.map((c) => (
                      <tr key={c.party} className="border-b border-rule"><td className="py-1 pr-3">{c.party}</td><td className="py-1 px-2 num">{pct(c.pct)}</td><td className="py-1 pl-2 num">{c.seats}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted mt-3">Източник: <a className="underline" href={D.url}>{D.source}</a>.</p>
    </section>
  );
}
