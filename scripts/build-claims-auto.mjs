// Автоматична сверка (без изкуствен интелект) на числата от изказванията в парламента с официалните данни
// на Евростат/НСИ (data/stats.json). Правило: разлика до допуска = „Съвпада“, до двоен допуск = „Близо“, иначе „Разминава се“.
// Сверява се само числото, не цялото твърдение. Пише data/checks-auto.json.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

if (!existsSync("data/steno-claims.json")) process.exit(0);
const { claims } = JSON.parse(readFileSync("data/steno-claims.json", "utf8"));
const ST = JSON.parse(readFileSync("data/stats.json", "utf8")).series;
const bg = (id) => ST[id]?.lines?.BG ?? {};
const src = (id) => ST[id]?.url ?? "https://ec.europa.eu/eurostat";
const ym = (d) => d.slice(0, 7);

// Кандидати за официална стойност към датата на изказването: последните публикувани периоди.
function candidates(ind, date) {
  const y = Number(date.slice(0, 4));
  const yearly = (id, n = 2) => Object.entries(bg(id)).filter(([k]) => /^\d{4}$/.test(k) && Number(k) < y).sort().slice(-n).map(([k, v]) => ({ period: k, value: v, id }));
  switch (ind) {
    case "inflation": {
      const m = Object.entries({ ...bg("inflation_monthly"), ...bg("inflation_monthly_2026") }).filter(([k]) => /^\d{4}-\d\d$/.test(k) && k < ym(date)).sort().slice(-3).map(([k, v]) => ({ period: k, value: v, id: k.startsWith("2026") ? "inflation_monthly_2026" : "inflation_monthly" }));
      return [...m, ...yearly("inflation", 1)];
    }
    case "unemployment": return yearly("unemployment");
    case "debt": return yearly("debt");
    case "deficit": return yearly("deficit").map((c) => ({ ...c, value: Math.abs(c.value) }));
    case "gdp_growth": return yearly("gdp_growth");
    case "min_wage": return Object.entries(bg("min_wage_all")).filter(([k]) => k.slice(0, 4) <= date.slice(0, 4)).sort().slice(-1).map(([k, v]) => ({ period: k, value: v, id: "min_wage_all" }));
  }
  return [];
}
const TOL = { inflation: 0.5, unemployment: 0.5, debt: 1.5, deficit: 0.5, gdp_growth: 0.5, min_wage: 2 };
const NAME = { inflation: "годишна инфлация (ХИПЦ)", unemployment: "безработица", debt: "държавен дълг, % от БВП", deficit: "бюджетен дефицит, % от БВП", gdp_growth: "реален растеж на БВП", min_wage: "минимална месечна заплата" };

const out = [];
for (const c of claims) {
  const cs = candidates(c.ind, c.date);
  if (!cs.length) continue;
  const best = cs.map((x) => ({ ...x, diff: Math.abs(x.value - c.value) })).sort((a, b) => a.diff - b.diff)[0];
  const tol = TOL[c.ind];
  const verdict = best.diff <= tol ? "match" : best.diff <= 2 * tol ? "close" : "off";
  out.push({ ...c, indicator: NAME[c.ind], official: best.value, period: best.period, source: src(best.id), verdict, diff: Math.round(best.diff * 10) / 10, all: cs.map((x) => [x.period, x.value]) });
}
out.sort((a, b) => (a.date < b.date ? 1 : -1));
writeFileSync("data/checks-auto.json", JSON.stringify({ updated: new Date().toISOString().slice(0, 10), checks: out }));
const k = (v) => out.filter((x) => x.verdict === v).length;
console.log(`data/checks-auto.json: ${out.length} сверки — съвпада ${k("match")}, близо ${k("close")}, разминава се ${k("off")}`);
