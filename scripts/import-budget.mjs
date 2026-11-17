// Държавен бюджет: закон 2026 (приходи, разходи, трансфери, министерства) и изпълнение досега.
// Източник: Министерство на финансите, обработено от „Наясно“ (MIT).
import { writeFileSync } from "node:fs";
const R = "https://raw.githubusercontent.com/atanasster/electionsbg/main/data/budget";
const get = async (f) => (await fetch(`${R}/${f}`)).json();
const [law, admin, frame] = await Promise.all([get("derived/law_framework.json"), get("derived/admin_flow.json"), get("derived/fy2026_frame.json")]);
const Y = "2026";
const eur = (n) => n?.amount?.amountEur ?? null;
const lines = (node) => (node?.lines ?? []).map((l) => ({ code: l.code, label: l.labelBg, eur: eur(l), lines: lines(l) }));
const a = admin.fiscalYears[Y];
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
};
writeFileSync("data/budget-2026.json", JSON.stringify(out));
console.log("приходи", out.revenue.total, "разходи", out.expenditure.total, "трансфери", out.transfers.totalEur, "салдо", out.balance, "министерства", out.ministries.length);
