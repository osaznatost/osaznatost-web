// Сбит списък на законопроектите за сайта (data/bills.json) от суровите данни в data/bills-src.
// Без текстовете: само кой, кога, кои комисии, кой е дал становище, кога е обсъждан, обнародван ли е.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
const DIR = "data/bills-src";
if (!existsSync(DIR)) process.exit(0);
const out = [];
// Изречения от докладите на комисиите, които си струва да се видят: обявен конфликт на интереси, несъгласие на министерство, гласуване в комисията.
const sentences = (t) => t.replace(/\s+/g, " ").split(/(?<=[.!?])\s+(?=[А-ЯA-Z„])/);
function notes(reports, sign) {
  const conflict = new Set(), against = new Set(), votes = [];
  const SIGN = /\d{2}-\d{3}-\d{2,3}-\d+/g;
  for (const r of reports) {
    // Общ доклад за няколко законопроекта: изречението важи за този законопроект само ако споменава неговия номер,
    // или ако не споменава никакъв номер и докладът е само за него.
    const joint = new Set((r.text ?? "").match(SIGN) ?? []).size > 1;
    for (const x of sentences(r.text ?? "")) {
      // обявеният конфликт на интереси важи за цялото заседание
      if (/конфликт на интереси/i.test(x) && /(няма да участва|не участва|отвод|декларира|заяви|обяви)/i.test(x) && x.length < 400) { conflict.add(x.trim()); continue; }
      const signs = x.match(SIGN) ?? [];
      if (signs.length ? !signs.includes(sign) : joint) continue;
      if (/конфликт на интереси/i.test(x) && /(няма да участва|не участва|отвод|декларира|заяви|обяви)/i.test(x) && x.length < 400) conflict.add(x.trim());
      if (/(министерств|агенци|комисия за|сметната палата|омбудсман)[^.]{0,120}не подкрепя/i.test(x) && x.length < 400) against.add(x.trim());
      const m = x.match(/„за“\s*[–-]?\s*(\d+)[^.]{0,30}„против“\s*[–-]?\s*(\d+)(?:[^.]{0,30}„въздържал(?:и)? се“\s*[–-]?\s*(\d+))?/)
        ?? x.match(/(\d+)\s+гласа?\s+„за“[^.]{0,40}?(\d+)\s+(?:гласа?\s+)?„против“(?:[^.]{0,40}?(\d+)\s+(?:гласа?\s+)?„въздържал)?/);
      if (m && /комисия|гласува|резултат/i.test(x)) votes.push({ stage: r.stage, committee: r.committee, yes: +m[1], no: +m[2], abst: m[3] ? +m[3] : 0 });
    }
  }
  return { conflict: [...conflict].slice(0, 3), against: [...against].slice(0, 3), votes: votes.slice(0, 4) };
}
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
    notes: notes(b.reports, b.sign),
  });
}
out.sort((a, b) => (a.date < b.date ? 1 : -1));
writeFileSync("data/bills.json", JSON.stringify({ updated: new Date().toISOString().slice(0, 10), bills: out }));
console.log(`data/bills.json: ${out.length} законопроекта`);
