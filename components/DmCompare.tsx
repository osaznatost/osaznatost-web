import { data } from "@/lib/data";

type Item = { dan: number; gtin: string; brand: string; name: string; bg: number; de?: number; at?: number; ro?: number; hr?: number };
type Sum = { n: number; median: number | null; dearer: number | null; cheaper: number | null; basketBg: number; basketOther: number };
type Dm = { date: string; ron: number; summary: Record<"de" | "at" | "ro" | "hr", Sum>; items: Item[] };

const C = [["de", "Германия"], ["at", "Австрия"], ["ro", "Румъния"], ["hr", "Хърватия"]] as const;
const eur = (v?: number) => (v == null ? "–" : `${v.toLocaleString("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`);
const pc = (v: number) => `${v > 0 ? "+" : ""}${v.toLocaleString("bg-BG", { maximumFractionDigits: 1 })}%`;
const dmy = (d: string) => d.split("-").reverse().join(".");
const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

/** dm: един и същ продукт (еднакъв баркод) в България и в още 4 държави от ЕС. */
export async function DmCompare() {
  const D = await data<Dm>("dm/prices.json");
  if (!D?.items.length) return <p className="text-muted">Цените от dm още се зареждат.</p>;
  const all4 = D.items.filter((x) => x.de && x.at && x.ro && x.hr);
  const vsDe = D.items.filter((x) => x.de).map((x) => ({ x, d: (x.bg / x.de! - 1) * 100 }));
  const dearer = [...vsDe].sort((a, b) => b.d - a.d).slice(0, 12);
  const cheaper = [...vsDe].sort((a, b) => a.d - b.d).slice(0, 12);
  const brands = Object.entries(vsDe.reduce<Record<string, number[]>>((m, { x, d }) => ((m[x.brand] ??= []).push(d), m), {}))
    .filter(([, v]) => v.length >= 15).map(([b, v]) => ({ b, n: v.length, m: med(v) })).sort((a, b) => b.m - a.m);
  const Row = ({ x, d }: { x: Item; d: number }) => (
    <tr className="border-b border-rule">
      <td className="p-2"><span className="block">{x.name}</span><span className="text-xs text-muted">{x.brand} · баркод {x.gtin}</span></td>
      <td className="p-2 num font-semibold">{eur(x.bg)}</td>
      {C.map(([c]) => <td key={c} className="p-2 num">{eur(x[c])}</td>)}
      <td className={`p-2 num font-semibold ${d > 0 ? "text-red" : "text-green"}`}>{pc(d)}</td>
    </tr>
  );
  const head = (
    <thead><tr className="text-left text-sm text-muted border-b border-rule">
      <th className="p-2">Продукт</th><th className="p-2">България</th>{C.map(([c, n]) => <th key={c} className="p-2">{n}</th>)}<th className="p-2">БГ спрямо Германия</th>
    </tr></thead>
  );
  return (
    <div className="space-y-6 text-[15px]">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {C.map(([c, n]) => {
          const s = D.summary[c];
          return (
            <div key={c} className="bg-surface rounded-sm p-4">
              <p className="text-sm text-muted">България спрямо {n}</p>
              <p className={`display num text-[2.2rem] leading-none mt-1 ${s.median != null && s.median > 0 ? "text-red" : ""}`}>{s.median == null ? "–" : pc(s.median)}</p>
              <p className="text-xs text-muted mt-1">типична разлика, {s.n.toLocaleString("bg-BG")} еднакви продукта</p>
              <p className="text-xs mt-1">По-скъпо у нас: {s.dearer}% · по-евтино: {s.cheaper}%</p>
              <p className="text-xs text-muted">Всички заедно: {eur(s.basketBg)} у нас срещу {eur(s.basketOther)}</p>
            </div>
          );
        })}
      </div>
      {brands.length > 0 && (
        <div>
          <p className="font-semibold mb-2">По марки: колко по-скъпо е в България спрямо Германия (типично)</p>
          <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-1">
            {brands.slice(0, 20).map((b) => (
              <li key={b.b} className="grid grid-cols-[1fr_auto] gap-3 border-b border-rule py-1"><span>{b.b} <span className="text-xs text-muted">({b.n})</span></span><span className={`num font-semibold ${b.m > 0 ? "text-red" : "text-green"}`}>{pc(Math.round(b.m * 10) / 10)}</span></li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <p className="font-semibold mb-2">Най-голяма разлика нагоре: по-скъпо в България</p>
        <div className="overflow-x-auto"><table className="w-full text-sm">{head}<tbody>{dearer.map((r) => <Row key={r.x.dan} {...r} />)}</tbody></table></div>
      </div>
      <div>
        <p className="font-semibold mb-2">Най-голяма разлика надолу: по-евтино в България</p>
        <div className="overflow-x-auto"><table className="w-full text-sm">{head}<tbody>{cheaper.map((r) => <Row key={r.x.dan} {...r} />)}</tbody></table></div>
      </div>
      <p className="text-sm text-muted">Източник: онлайн каталогът на dm в петте държави, {dmy(D.date)}. Сравняват се само продукти с един и същ dm номер и баркод, тоест една и съща разфасовка. Цените в Румъния са в леи и са превърнати в евро по курса на ЕЦБ ({D.ron} леи за 1 €). Цените са онлайн цените на веригата; в отделни магазини и при промоции може да са различни. В {all4.length.toLocaleString("bg-BG")} продукта има цена и в петте държави.</p>
    </div>
  );
}
