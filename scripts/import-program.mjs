// Седмичната програма на Народното събрание (parliament.bg/api/v1/plenaryprogram).
// Пише data/program.json (текущата) и трупа архив в data/program-history.json.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
const H = { Origin: "https://www.parliament.bg", Referer: "https://www.parliament.bg/bg/plenaryprogram", Accept: "application/json" };
const strip = (s) => (s ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

// parliament.bg понякога не отговаря: 3 опита, после изход без грешка (старите данни остават)
let r = null;
for (let i = 0; i < 3 && !r?.ok; i++) {
  try { r = await fetch("https://www.parliament.bg/api/v1/plenaryprogram/bg/0", { headers: H, signal: AbortSignal.timeout(30000) }); }
  catch (e) { console.warn("Опит", i + 1, e.cause?.code ?? e.message); }
  if (!r?.ok) await new Promise((ok) => setTimeout(ok, 20000));
}
if (!r?.ok) { console.warn("parliament.bg не отговаря — пропускам този път"); process.exit(0); }
const p = await r.json();
const points = Object.values(p.points ?? {}).map((x, i) => ({
  n: i + 1,
  text: strip(x.Name),
  control: !!x.Pl_Control_id,
  acts: (x.acts ?? []).map((a) => ({ id: a.L_Act_id, sign: a.L_Act_sign, title: strip(a.L_ActL_title), type: a.L_Act_T_id })),
}));
const program = {
  from: p.Pl_Prog_date1, to: p.Pl_Prog_date2,
  status: strip(p.Pl_ProgSL_value), approved: p.Pl_ProgS_id !== 2,
  kind: strip(p.Pl_ProgTL_value), time: [p.CTimeFrom, p.CTime].filter(Boolean).map((t) => t.slice(0, 5)),
  note: strip(p.Pl_ProgL_value), header: strip(p.Pl_Prog_hd), footer: strip(p.Pl_Prog_ft),
  points, fetched: new Date().toISOString(),
  source: "https://www.parliament.bg/bg/plenaryprogram",
};
// Празна програма идва между седмиците или във ваканция — старите данни остават, без грешка
if (!points.length) { console.warn("Програмата още е празна (", program.from, ") — пропускам"); process.exit(0); }
writeFileSync("data/program.json", JSON.stringify(program, null, 1));

const histPath = "data/program-history.json";
const hist = existsSync(histPath) ? JSON.parse(readFileSync(histPath, "utf8")) : [];
const i = hist.findIndex((h) => h.from === program.from);
const { fetched, ...rest } = program;
if (i >= 0) hist[i] = rest; else hist.push(rest);
hist.sort((a, b) => (a.from < b.from ? 1 : -1));
writeFileSync(histPath, JSON.stringify(hist.slice(0, 104), null, 1));
console.log(program.from, "–", program.to, program.status, points.length, "точки");
