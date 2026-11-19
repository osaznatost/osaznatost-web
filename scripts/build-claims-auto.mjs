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

// За да е честна, сверката се прави само когато е ясно за кой период е числото:
//  • изречението назовава година → сравнява се с официалната стойност за същата година;
//  • или говори за сегашното положение („в момента“, „сега“, „към момента“...) → последните публикувани данни.
// Изключват се планове, бюджети, хипотези и сметки „по стария механизъм“, нетни и годишни суми.
const PLAN = /(бюджет|заложен|планира|предлага|предвижда|по стари|трябваше|щеше|би бил|би трябвало|нетн|на година|годишно|ще получава|ще бъде|ще е |може да|рекорден|допусн|разрешен|таван|до \d|намаля|увелич|дерогац|начислена|касов|спрямо|предложен|по отношение|убежда|няма как|твърдяха|казваха)/i;
const NOW = /(в момента|към момента|сега |днес|в последните месеци|последн(ия|ите) (месец|данни)|текущ|вече е|към днешна)/i;
const out = [];
for (const c of claims) {
  if (PLAN.test(c.text)) continue;
  const years = [...c.text.matchAll(/\b(20[12]\d)\b/g)].map((m) => m[1]);
  let cs;
  if (years.length === 1) {
    const y = years[0];
    const id = { inflation: "inflation", unemployment: "unemployment", debt: "debt", deficit: "deficit", gdp_growth: "gdp_growth" }[c.ind];
    const v = id ? bg(id)[y] : undefined;
    if (v == null) continue;
    cs = [{ period: y, value: c.ind === "deficit" ? Math.abs(v) : v, id }];
  } else if (years.length === 0 && NOW.test(c.text)) {
    cs = candidates(c.ind, c.date);
  } else continue;
  if (!cs.length) continue;
  const best = cs.map((x) => ({ ...x, diff: Math.abs(x.value - c.value) })).sort((a, b) => a.diff - b.diff)[0];
  const tol = TOL[c.ind];
  // „над 20%“, „под 3%“, „по-ниска от 7%“ — неравенство, не точно число
  const num = String(c.value).replace(".", ",");
  const before = c.text.slice(0, Math.max(0, c.text.indexOf(num))).slice(-25);
  const gt = /(над|повече от|по-висок\S* от)\s*$/i.test(before);
  const lt = /(под|по-ниск\S* от|по-малко от|по-малк\S* от)\s*$/i.test(before);
  let verdict = best.diff <= tol ? "match" : best.diff <= 2 * tol ? "close" : "off";
  if (gt) verdict = best.value > c.value ? "match" : best.value > c.value - tol ? "close" : "off";
  if (lt) verdict = best.value < c.value ? "match" : best.value < c.value + tol ? "close" : "off";
  out.push({ ...c, indicator: NAME[c.ind], official: best.value, period: best.period, source: src(best.id), verdict, cmp: gt ? "gt" : lt ? "lt" : "eq", diff: Math.round(best.diff * 10) / 10, all: cs.map((x) => [x.period, x.value]) });
}
out.sort((a, b) => (a.date < b.date ? 1 : -1));
writeFileSync("data/checks-auto.json", JSON.stringify({ updated: new Date().toISOString().slice(0, 10), checks: out }));
const k = (v) => out.filter((x) => x.verdict === v).length;
console.log(`data/checks-auto.json: ${out.length} сверки — съвпада ${k("match")}, близо ${k("close")}, разминава се ${k("off")}`);
