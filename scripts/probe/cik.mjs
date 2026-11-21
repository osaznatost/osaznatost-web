import { readFileSync } from "node:fs";
const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SECRET_KEY, H = { apikey: KEY, authorization: `Bearer ${KEY}` };
const LAT = { A: "А", B: "В", C: "С", E: "Е", H: "Н", K: "К", M: "М", O: "О", P: "Р", T: "Т", X: "Х", Y: "У" };
const FORMS = new Set(["ЕООД", "ООД", "ЕАД", "АД", "ЕТ", "КД", "КДА", "СД", "ДЗЗД", "АДСИЦ", "ЛТД", "ГМБХ"]);
const normCo = (s) => String(s ?? "").toUpperCase().replace(/[ABCEHKMOPTXY]/g, (c) => LAT[c]).replace(/[^0-9A-ZА-ЯЁ]+/g, " ").trim().split(" ").filter((w) => w && !FORMS.has(w)).join(" ");
const names = new Map(); let last = 0;
for (;;) { let r; for (let a=0;a<4&&!r?.ok;a++){ r = await fetch(`${URL_}/rest/v1/proc_contracts?select=id,supplier_names,subcontractor_names&order=id&limit=5000&id=gt.${last}`, { headers: H }); if(!r.ok) await new Promise(s=>setTimeout(s,3000)); }
  const rows = await r.json(); if (!rows.length) break; last = rows.at(-1).id;
  for (const x of rows) for (const n of [...(x.supplier_names ?? []), ...(x.subcontractor_names ?? [])]) { const k = normCo(n); if (k) names.set(k, n); } }
console.log("## suppliers", names.size);
const keys = [...names.keys()]; const byTok = new Map(); keys.forEach((k) => k.split(" ").forEach((t) => { if (t.length >= 4) (byTok.get(t) ?? byTok.set(t, []).get(t)).push(k); }));
let tot = 0, exact = 0, near = 0; const ex = []; const shapes = {};
for (const y of ["2026", "2025", "2024", "2023"]) for (const p of JSON.parse(readFileSync(`data/declarations/${y}.json`, "utf8")).people) for (const it of p.items) {
  tot++; const k = normCo(it.co); if (names.has(k)) { exact++; continue; }
  const toks = k.split(" ").filter((t) => t.length >= 4); if (!toks.length) { shapes.short = (shapes.short||0)+1; continue; }
  const cand = (byTok.get(toks.sort((a,b)=>(byTok.get(a)?.length??1e9)-(byTok.get(b)?.length??1e9))[0]) ?? []).filter((c) => toks.every((t) => c.split(" ").includes(t)));
  if (cand.length) { near++; if (ex.length < 60) ex.push(`${it.co}  =>  ${cand.slice(0,3).map(c=>names.get(c)).join(" | ")}`); }
}
console.log("## items", tot, "exact", exact, "near(token-subset)", near, JSON.stringify(shapes));
ex.forEach((e) => console.log("## EX", e));
