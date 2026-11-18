// Сбит списък на законопроектите за сайта (data/bills.json) от суровите данни в data/bills-src.
// Без текстовете: само кой, кога, кои комисии, кой е дал становище, кога е обсъждан, обнародван ли е.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
const DIR = "data/bills-src";
if (!existsSync(DIR)) process.exit(0);
const out = [];
for (const f of readdirSync(DIR).filter((x) => /^\d+\.json$/.test(x))) {
  const b = JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"));
  out.push({
    id: b.id, sign: b.sign, date: b.date, title: b.title, final: b.final, url: b.url, withdrawn: b.withdrawn,
    adopted: b.adopted, dv: b.dv, veto: b.veto,
    byGov: /-602-/.test(b.sign) || /Министерски съвет/i.test(b.motives.slice(0, 400)),
    sponsors: b.sponsors, committees: b.committees,
    opinions: b.opinions.map((o) => ({ date: o.date, title: o.title.replace(/^Становище (на |от )?/i, "") })),
    reports: b.reports.map((r) => ({ date: r.date, committee: r.committee, stage: r.stage })),
    hall: b.hall.map((h) => ({ date: h.date, stage: h.stage, url: h.url })),
    proposals: b.proposals.length,
  });
}
out.sort((a, b) => (a.date < b.date ? 1 : -1));
writeFileSync("data/bills.json", JSON.stringify({ updated: new Date().toISOString().slice(0, 10), bills: out }));
console.log(`data/bills.json: ${out.length} законопроекта`);
