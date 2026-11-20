import LT from "@/data/local-taxes.json";

type T = { values: Record<string, number>; rank: number | null };
const DATA = (LT as unknown as { byCode: Record<string, Record<string, T>>; source: string; url: string }).byCode;
const ROWS: [string, string, string][] = [
  ["property_tax_legal", "Данък върху нежилищни имоти на фирми", "‰ от данъчната оценка"],
  ["transfer_tax", "Данък при покупка на имот", "% от цената"],
  ["vehicle_tax_74_110kw", "Данък за лек автомобил 74–110 kW", "€ на kW"],
  ["patent_tax_retail", "Патентен данък: магазин до 100 кв.м", "€ на кв.м"],
  ["patent_tax_taxi", "Данък за такси", "€ на година"],
];
const n = (v: number) => v.toLocaleString("bg-BG", { maximumFractionDigits: 2 });

/** Ставките на местните данъци в общината, по години, с място сред всички общини (1 = най-нисък). */
export function MuniTaxes({ code }: { code: string }) {
  const d = DATA[code];
  if (!d) return null;
  const years = [...new Set(Object.values(d).flatMap((x) => Object.keys(x.values)))].sort();
  return (
    <section id="danaci" className="mb-12 scroll-mt-32 lg:scroll-mt-20">
      <h2 className="text-xl font-bold mb-1">Местни данъци</h2>
      <p className="text-[15px] text-muted mb-3 max-w-3xl">Общинският съвет определя ставките всяка година в границите на закона. Мястото е сред всички общини, като 1 е най-ниският данък.</p>
      <div className="overflow-x-auto">
        <table data-nostack className="w-full text-[15px] border-collapse">
          <thead><tr className="text-left border-b border-rule"><th className="py-1 pr-3">Данък</th>{years.map((y) => <th key={y} className="py-1 px-2 num">{y}</th>)}<th className="py-1 pl-2 num">Място</th></tr></thead>
          <tbody>{ROWS.filter(([k]) => d[k]).map(([k, label, unit]) => {
            const x = d[k];
            return (
              <tr key={k} className="border-b border-rule">
                <td className="py-1 pr-3">{label} <span className="text-xs text-muted">({unit})</span></td>
                {years.map((y, i) => {
                  const v = x.values[y], prev = x.values[years[i - 1]];
                  return <td key={y} className={`py-1 px-2 num ${v !== undefined && prev !== undefined && v > prev ? "font-semibold" : ""}`}>{v === undefined ? "–" : n(v)}</td>;
                })}
                <td className="py-1 pl-2 num">{x.rank ?? "–"}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      <p className="text-xs text-muted mt-2">С удебелен шрифт е годината, в която ставката е вдигната. Сумите са в евро (превърнати от левове). Източник: <a href="https://www.regionalprofiles.bg/" target="_blank" rel="noreferrer">ИПИ, „Регионални профили“</a>, по заявления по ЗДОИ до общините; обработено от „Наясно“.</p>
    </section>
  );
}
