// Държавен бюджет: последният приет закон (годината се избира сама) (приходи, разходи, трансфери, министерства) и изпълнение досега.
// Източник: Министерство на финансите, обработено от „Наясно“ (MIT).
import { writeFileSync } from "node:fs";
const R = "https://raw.githubusercontent.com/atanasster/electionsbg/main/data/budget";
const get = async (f) => { const r = await fetch(`${R}/${f}`); return r.ok ? r.json() : null; };
const [law, admin] = await Promise.all([get("derived/law_framework.json"), get("derived/admin_flow.json")]);
// Най-новата година, за която има и закон, и разпределение по министерства. Когато излезе
// бюджет 2027, страницата минава на него сама; предишните години остават за сравнение.
const Y = Object.keys(law).filter((y) => law[y]?.revenue && admin.fiscalYears[y]?.ministries?.length).sort().at(-1);
const frame = (await get(`derived/fy${Y}_frame.json`)) ?? { throughMonth: null, revenue: null, expenditure: null };
const eur = (n) => n?.amount?.amountEur ?? null;
const lines = (node) => (node?.lines ?? []).map((l) => ({ code: l.code, label: l.labelBg, eur: eur(l), lines: lines(l) }));
const a = admin.fiscalYears[Y];
const flat = (node) => (node?.lines ?? []).flatMap((l) => [l, ...flat(l)]);
const history = Object.keys(law).sort().map((y) => ({
  year: Number(y), revenue: eur(law[y].revenue), expenditure: eur(law[y].expenditure), euContribution: eur(law[y].euContribution),
  transfers: admin.fiscalYears[y]?.plannedTransfers?.totalEur ?? null, balance: admin.fiscalYears[y]?.plannedBalanceEur ?? null,
}));
const out = {
  source: "Министерство на финансите (Закон за държавния бюджет и месечно изпълнение), обработено от „Наясно“",
  year: Number(Y),
  revenue: { total: eur(law[Y].revenue), lines: lines(law[Y].revenue) },
  expenditure: { total: eur(law[Y].expenditure), lines: lines(law[Y].expenditure) },
  euContribution: eur(law[Y].euContribution),
  transfers: a.plannedTransfers,
  balance: a.plannedBalanceEur,
  ministries: a.ministries.map((m) => ({ name: m.nameBg, planned: m.plannedEur, executed: m.executedEur })).sort((x, y) => (y.planned ?? 0) - (x.planned ?? 0)),
  execution: { throughMonth: frame.throughMonth, revenue: frame.revenue, expenditure: frame.expenditure },
  history,
  // Предходни години по редове, за сравнение ред по ред (закон, не изпълнение).
  prev: Object.fromEntries(Object.keys(law).filter((y) => y < Y).sort().slice(-4).map((y) => [y, {
    revenue: Object.fromEntries(flat(law[y].revenue).map((l) => [l.code + "|" + l.labelBg, eur(l)])),
    expenditure: Object.fromEntries(flat(law[y].expenditure).map((l) => [l.code + "|" + l.labelBg, eur(l)])),
    transfers: Object.fromEntries((admin.fiscalYears[y]?.plannedTransfers?.lines ?? []).map((l) => [l.code + "|" + l.labelBg, l.plannedEur])),
    ministries: Object.fromEntries((admin.fiscalYears[y]?.ministries ?? []).map((m) => [m.nameBg, m.plannedEur])),
  }])),
};
writeFileSync("data/budget.json", JSON.stringify(out));
console.log("година", Y, "приходи", out.revenue.total, "разходи", out.expenditure.total, "трансфери", out.transfers.totalEur, "салдо", out.balance, "министерства", out.ministries.length);
