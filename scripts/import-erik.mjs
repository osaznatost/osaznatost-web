// Дарения за предизборните кампании от ЕРИК (Единен регистър по Изборния кодекс, Сметната палата, erik.bulnao.government.bg).
// ЕРИК отказва на сървърите на GitHub (403), затова даренията се събират в браузър (по избори) и се подават тук:
//   node scripts/import-erik.mjs erik-dareniya.json
// Вход: [{ id, name, rows: [{ fullName, donateTo, donationDate, donationType, description, donationPrice, donationValue, hasDeclaration }] }]
// Изход: data/erik/donations.json — по избори и по участник: сума, брой дарения, най-големите дарения (от 5000 € нагоре, с името на дарителя,
// както е публикувано по закон). По-малките дарения са само в сбора: не правим списъци с имената на хората, дали малки суми.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const SRC = process.argv[2];
if (!SRC) throw new Error("Подайте файла");
const BIG = 5000;
const E = JSON.parse(readFileSync(SRC, "utf8"));
const tc = (s) => String(s ?? "").trim().replace(/\s+/g, " ").toLowerCase().replace(/(^|[\s-])(\S)/g, (m, a, b) => a + b.toUpperCase());
const out = [];
for (const el of E) {
  if (!el.rows?.length) continue;
  const P = new Map();
  for (const r of el.rows) {
    const to = String(r.donateTo ?? "").replace(/\s+/g, " ").trim();
    const eur = (Number(r.donationPrice) || 0) + (Number(r.donationValue) || 0);
    const p = P.get(to) ?? { name: to, eur: 0, n: 0, money: 0, inKind: 0, big: [] };
    p.eur += eur; p.n++;
    if (/парич/i.test(r.donationType ?? "")) p.money += eur; else p.inKind += eur;
    if (eur >= BIG) p.big.push([tc(r.fullName), Math.round(eur), String(r.donationDate ?? "").slice(0, 10), r.donationType ?? "", r.hasDeclaration === true || r.hasDeclaration === "true" ? 1 : 0]);
    P.set(to, p);
  }
  const parts = [...P.values()].map((p) => ({ ...p, eur: Math.round(p.eur), money: Math.round(p.money), inKind: Math.round(p.inKind), big: p.big.sort((a, b) => b[1] - a[1]) })).sort((a, b) => b.eur - a.eur);
  out.push({ id: Number(el.id), name: el.name, total: parts.reduce((s, p) => s + p.eur, 0), n: el.rows.length, participants: parts });
}
out.sort((a, b) => b.id - a.id);
mkdirSync("data/erik", { recursive: true });
writeFileSync("data/erik/donations.json", JSON.stringify({ source: "Сметна палата, Единен регистър по Изборния кодекс (ЕРИК), erik.bulnao.government.bg", fetched: new Date().toISOString().slice(0, 10), bigFrom: BIG, elections: out }));
for (const e of out) console.log(`${e.id} ${e.name}: ${e.n} дарения, ${e.total.toLocaleString("bg-BG")} €`);
