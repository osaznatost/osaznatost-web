// Законопроектите на 52-рото Народно събрание от parliament.bg: вносители, мотиви, доклади на комисиите,
// становища на външни организации и изказванията в пленарната зала по тях.
// Целта е за всеки гласуван закон да можем да обясним какво променя, какво казват вносителите и какво — критиците.
// Пише data/bills-src/index.json (списък) и data/bills-src/{id}.json (текстове, съкратени).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const DIR = "data/bills-src";
const NS = "52";
const START = Number(process.env.START ?? 166930);
const MINUTES = Number(process.env.MINUTES ?? 50);
const H = { Origin: "https://www.parliament.bg", Referer: "https://www.parliament.bg/bg/bills", Accept: "application/json" };
const deadline = Date.now() + MINUTES * 60e3;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(DIR, { recursive: true });

async function api(u) {
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(`https://www.parliament.bg/api/v1/${u}`, { headers: H, signal: AbortSignal.timeout(30000) });
      const t = await r.text();
      if (t.startsWith("<")) return null;
      return t ? JSON.parse(t) : null;
    } catch { await sleep(1500 * (a + 1)); }
  }
  return null;
}
const strip = (h) => String(h ?? "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&quot;/g, "\"").replace(/&amp;/g, "&").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
const longText = (o) => Object.values(o ?? {}).filter((v) => typeof v === "string" && v.length > 300).map(strip).join("\n\n");

async function pdf(url, max) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!r.ok) return "";
    const buf = Buffer.from(await r.arrayBuffer());
    writeFileSync("/tmp/b.pdf", buf);
    const t = execFileSync("pdftotext", ["-layout", "-enc", "UTF-8", "/tmp/b.pdf", "-"], { maxBuffer: 64e6 }).toString();
    return t.replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim().slice(0, max);
  } catch { return ""; }
}

// Откъс от стенограмата: от първото споменаване на закона нататък.
function excerpt(body, title, max) {
  const t = strip(body);
  const key = (title.match(/(Закона? за [^,]{6,60}|[А-Я][а-я]+ кодекс)/)?.[1] ?? title).replace(/^Закон /, "Закона ").slice(0, 50);
  let i = t.indexOf(key);
  if (i < 0) i = t.toLowerCase().indexOf(key.toLowerCase().slice(0, 30));
  return i < 0 ? "" : t.slice(Math.max(0, i - 300), i + max);
}

const IDX = `${DIR}/index.json`;
const index = existsSync(IDX) ? JSON.parse(readFileSync(IDX, "utf8")) : { last: START - 1, bills: {} };
let miss = 0, n = 0;

// 1) Нови номера.
for (let id = index.last + 1; miss < 250 && Date.now() < deadline; id++) {
  const b = await api(`bill/${id}`);
  if (!b?.L_Act_id) { miss++; continue; }
  miss = 0; index.last = id;
  if (b.A_ns_folder !== NS) continue;
  index.bills[id] = { sign: b.L_Act_sign, date: b.L_Act_date?.slice(0, 10), title: b.L_ActL_title, final: b.L_ActL_final || null, withdrawn: !!b.withdrawn, done: false };
}

// 2) Подробности и текстове за още необработените (и за обновяване на тези с ново движение).
const todo = Object.entries(index.bills).filter(([, x]) => !x.done || (process.env.REFRESH && !x.final));
for (const [id] of todo) {
  if (Date.now() > deadline) break;
  const b = await api(`bill/${id}`);
  if (!b) continue;
  const names = (l) => (l ?? []).map((p) => [p.A_ns_MPL_Name1, p.A_ns_MPL_Name3].filter(Boolean).map((s) => s[0] + s.slice(1).toLowerCase()).join(" "));
  const out = {
    id: Number(id), sign: b.L_Act_sign, date: b.L_Act_date?.slice(0, 10), title: b.L_ActL_title, final: b.L_ActL_final || null,
    url: `https://www.parliament.bg/bg/bills/ID/${id}`, withdrawn: !!b.withdrawn,
    dv: b.L_Act_dv_iss ? `ДВ, бр. ${b.L_Act_dv_iss}/${b.L_Act_dv_year}` : null, adopted: b.L_Act_date2?.slice(0, 10) ?? null,
    veto: b.L_Act_veto_date ?? null,
    sponsors: names(b.imp_list), sponsorsMin: (b.imp_list_min ?? []).map((m) => m.A_ns_MPL_Name1 ?? m.name ?? JSON.stringify(m)).slice(0, 3),
    committees: (b.dist_list ?? []).map((c) => `${c.A_ns_CL_value} (${c.L_Act_DTL_value})`),
    union: (b.union_list ?? []).map((u) => u.L_Act_sign ?? u.L_ActL_title ?? ""),
    motives: "", reports: [], opinions: [], hall: [], proposals: (b.proposal_12_list ?? []).map((p) => ({ doc: p.RN_DOC, date: p.DAT_DOC, by: names(p.imp_list) })),
  };
  const f = b.file_list?.[0]?.FILENAME;
  if (f) out.motives = await pdf(`https://www.parliament.bg/bills/${NS}/${f}`, 14000);
  for (const r of [...(b.stan_list ?? []), ...(b.stan_list2_1 ?? []), ...(b.stan_list_veto ?? [])].slice(0, 4)) {
    const j = await api(`com-stan/${r.A_ns_C_id}/${r.A_Cm_Stanid}`);
    out.reports.push({ date: r.A_Cm_Stan_date, committee: r.A_ns_CL_value, stage: r.L_Act_St_name, title: r.A_Cm_Stan_sub, text: longText(j).slice(0, 9000) });
  }
  for (const r of (b.standp_list ?? []).slice(0, 12)) {
    const j = await api(`com-stan/${r.A_ns_C_id}/${r.A_Cm_Stanid}`);
    out.opinions.push({ date: r.A_Cm_Stan_date, title: r.A_Cm_Stan_sub, text: longText(j).slice(0, 3500) });
  }
  for (const s of (b.steno_hall ?? []).filter((x) => x.Pl_Sten_id).slice(0, 3)) {
    const j = await api(`pl-sten/${s.Pl_Sten_id}`);
    out.hall.push({ date: s.L_Act_St_date, stage: s.L_Act_St2_name, url: `https://www.parliament.bg/bg/plenaryst/ns/${NS}/ID/${s.Pl_Sten_id}`, text: excerpt(j?.Pl_Sten_body, out.title, 18000) });
  }
  writeFileSync(`${DIR}/${id}.json`, JSON.stringify(out));
  index.bills[id] = { sign: out.sign, date: out.date, title: out.title, final: out.final, withdrawn: out.withdrawn, adopted: out.adopted, done: true };
  n++;
  if (n % 10 === 0) writeFileSync(IDX, JSON.stringify(index));
}
writeFileSync(IDX, JSON.stringify(index));
const all = Object.values(index.bills);
console.log(`Законопроекти: ${all.length}, обработени: ${all.filter((x) => x.done).length} (сега ${n}); последен номер ${index.last}`);
