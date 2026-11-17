// Финанси на общините от отчетите на Министерството на финансите (чл. 130г ЗПФ), обработени от „Наясно“ (MIT).
// Записва data/municipal-finance.json: последното пълно тримесечие и годишна история (четвърто тримесечие).
import { writeFileSync } from "node:fs";
const R = "https://raw.githubusercontent.com/atanasster/electionsbg/main/data/budget/municipal_fiscal";
const idx = await (await fetch(`${R}/index.json`)).json();
const quarters = idx.quarters.map((q) => q.period);
const years = [...new Set(quarters.filter((q) => q.endsWith("Q4")).map((q) => q.slice(0, 4)))];
const latest = idx.newestQuarter;
const eur = (x) => (x?.amountEur == null ? null : Math.round(x.amountEur));
// В ЕКАТТЕ Столична община е SOF46, в отчетите на МФ е SOF00.
const code = (c) => (c === "SOF00" ? "SOF46" : c);
const out = { source: "Министерство на финансите, финансови показатели на общините (чл. 130г ЗПФ), обработени от „Наясно“", latest, byCode: {} };

const load = async (p) => (await (await fetch(`${R}/${p}.json`)).json()).rows;
for (const r of await load(latest)) {
  out.byCode[code(r.obshtina)] = {
    name: r.nameBg, period: latest,
    revenue: eur(r.revenue), expenditure: eur(r.expenditure), balance: eur(r.budgetBalance), debt: eur(r.debtStock),
    arrears: eur(r.arrears), cash: eur(r.cashOnHand),
    ownShare: r.indicators?.revenueSharePct ?? null, coverage: r.indicators?.localCoveragePct ?? null,
    wageShare: r.indicators?.wageSharePct ?? null, capitalShare: r.indicators?.capitalSharePct ?? null,
    debtPerCapita: r.indicators?.debtPerCapita ?? null, collection: r.collection?.avgPct ?? null,
    recovery: Boolean(r.inRecoveryProcedure), history: [],
  };
}
for (const y of years) {
  for (const r of await load(`${y}-Q4`)) {
    const m = out.byCode[code(r.obshtina)];
    if (m) m.history.push({ year: Number(y), revenue: eur(r.revenue), expenditure: eur(r.expenditure), debt: eur(r.debtStock), arrears: eur(r.arrears) });
  }
}
writeFileSync("data/municipal-finance.json", JSON.stringify(out));
console.log(Object.keys(out.byCode).length, "общини, последно тримесечие", latest, "години", years.join(","));
