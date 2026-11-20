// Местни избори 2011–2023 по общини: кмет на общината и общински съвет.
// Източник: ЦИК (results.cik.bg), обработено от „Наясно“ (github.com/atanasster/electionsbg, MIT).
// Пускa се в GitHub Actions: хранилището с данни не е достъпно от всички мрежи.
import { readFileSync, writeFileSync } from "node:fs";
const B = "https://storage.googleapis.com/data-electionsbg-com";
const CYCLES = [["2011_10_23_mi", 2011], ["2015_10_25_mi", 2015], ["2019_10_27_mi", 2019], ["2023_10_29_mi", 2023]];
const places = JSON.parse(readFileSync("data/places.json", "utf8"));
const codes = [...new Set(places.oblasts.flatMap((o) => o.municipalities.map((m) => m.code)))];
const clean = (s) => (s ?? "").replace(/\s+/g, " ").replace(/^(ПП|КП|КОАЛИЦИЯ|ПАРТИЯ)\s+/i, (m) => m).trim();
const cand = (c) => c && { name: c.candidateName, party: clean(c.localPartyName), votes: c.votes, pct: c.pctOfValid, ind: !!c.isIndependent };
const out = {};
let fails = 0;
for (const [cycle, year] of CYCLES) {
  let i = 0;
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (i < codes.length) {
      const code = codes[i++];
      for (let a = 0; a < 3; a++) {
        try {
          const r = await fetch(`${B}/${cycle}/municipalities/${code}.json`);
          if (r.status === 404) break;
          if (!r.ok) throw new Error(String(r.status));
          const d = await r.json();
          const p = d.protocol ?? {};
          const m = d.mayor ?? {};
          const r1 = [...(m.round1 ?? [])].sort((x, y) => y.votes - x.votes);
          const r2 = [...(m.round2 ?? [])].sort((x, y) => y.votes - x.votes);
          const council = (d.council ?? []).filter((c) => c.mandatesWon > 0).sort((x, y) => y.mandatesWon - x.mandatesWon || y.totalVotes - x.totalVotes)
            .map((c) => ({ party: clean(c.localPartyName), votes: c.totalVotes, pct: c.pctOfValid, seats: c.mandatesWon }));
          (out[code] ??= {})[year] = {
            registered: p.numRegisteredVoters ?? null, voted: p.totalActualVoters ?? null, valid: p.numValidVotes ?? null,
            mayor: cand(m.elected) ?? null, round: m.elected?.round ?? null,
            round1: r1.slice(0, 3).map(cand), round2: r2.slice(0, 2).map(cand),
            council, seats: council.reduce((s, c) => s + c.seats, 0),
          };
          break;
        } catch { if (a === 2) fails++; await new Promise((s) => setTimeout(s, 1500)); }
      }
    }
  }));
  console.log(year, "общини:", Object.values(out).filter((x) => x[year]).length);
}
if (Object.keys(out).length < 200) { console.error("Твърде малко общини, не записвам"); process.exit(1); }
writeFileSync("data/local-elections.json", JSON.stringify({
  source: "ЦИК (results.cik.bg), обработено от „Наясно“ (github.com/atanasster/electionsbg, MIT)", url: "https://results.cik.bg/",
  updated: new Date().toISOString().slice(0, 10), cycles: CYCLES.map(([, y]) => y), byCode: out,
}));
console.log("общини:", Object.keys(out).length, "от", codes.length, "неуспешни заявки:", fails);
