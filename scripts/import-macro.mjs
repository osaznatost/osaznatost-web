// Автоматично обновяване на макро параметрите (без ИИ, само от официални публикации):
//  • инфлация по ИПЦ и по групи — прессъобщенията на НСИ (HTML таблица);
//  • лихви по нов бизнес — месечното прессъобщение на БНБ (PDF, приложение 1);
//  • държавен дълг, % от БВП — Евростат, gov_10dd_edpt1 (API).
// Записва data/macro/*.json само ако е намерено нещо ново и валидно; при грешка оставя старото.
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import os from "node:os";

const H = { "user-agent": "Mozilla/5.0 (osaznatost.bg; open data)" };
const DIR = "data/macro";
const today = new Date().toISOString().slice(0, 10);
const read = (f) => JSON.parse(readFileSync(path.join(DIR, f), "utf8"));
const save = (f, o) => writeFileSync(path.join(DIR, f), JSON.stringify(o, null, 1) + "\n");
async function get(url, bin = false) {
  for (let i = 0; i < 3; i++) {
    try {
      const c = new AbortController(); const t = setTimeout(() => c.abort(), 30000);
      const r = await fetch(url, { headers: H, signal: c.signal }); clearTimeout(t);
      if (r.ok) return bin ? Buffer.from(await r.arrayBuffer()) : await r.text();
      if (r.status === 404) return null;
    } catch { /* повтори */ }
    await new Promise((r) => setTimeout(r, 3000 * (i + 1)));
  }
  return null;
}
const MONTHS = ["януари", "февруари", "март", "април", "май", "юни", "юли", "август", "септември", "октомври", "ноември", "декември"];
const strip = (s) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
let changed = [];

// ── НСИ ─────────────────────────────────────────────────────────────
async function nsi() {
  const before = changed.length;
  const cpi = read("cpi.json");
  const list = await get("https://www.nsi.bg/statistical-data/113");
  if (!list) return console.log("НСИ: списъкът не се зарежда");
  const slugs = [...new Set(list.match(/press-release\/inflaciya-i-indeksi-na-potrebitelskite-ceni-[a-z0-9-]*?\d{4}-godina[a-z0-9-]*-\d+/g) ?? [])]
    .filter((s) => !/ekspresna/.test(s)).slice(0, 4);
  const GROUP = { "01": "food", "02": "alc", "03": "clothing", "04": "housing", "05": "furnishing", "06": "health", "07": "transport", "08": "communication", "09": "recreation", "10": "education", "11": "restaurants", "12": "insurance", "13": "personal" };
  let newestGroups = null;
  for (const slug of slugs) {
    const url = `https://www.nsi.bg/${slug}`;
    const html = await get(url);
    if (!html) continue;
    // Първата таблица е ИПЦ; третата колона е „<месец> <година> г. спрямо <месец> <година-1> г.“
    const tbl = html.slice(html.indexOf("<table"), html.indexOf("</table>") + 8);
    const head = strip(tbl.match(/<thead[\s\S]*?<\/thead>/)?.[0] ?? "");
    const hm = [...head.matchAll(new RegExp(`(${MONTHS.join("|")}) (\\d{4}) г\\. спрямо \\1 (\\d{4}) г\\.`, "g"))].at(-1);
    if (!hm || Number(hm[2]) - Number(hm[3]) !== 1) { console.log("НСИ: неразпозната таблица", url); continue; }
    const period = `${hm[2]}-${String(MONTHS.indexOf(hm[1]) + 1).padStart(2, "0")}`;
    const rows = [...tbl.matchAll(/<tr>\s*<td>(\d{2})<\/td>\s*<td>[^<]*<\/td>\s*<td>([\d.]+)<\/td>\s*<td>([\d.]+)<\/td>\s*<td>([\d.]+)<\/td>/g)];
    const idx = Object.fromEntries(rows.map((r) => [r[1], Math.round((Number(r[4]) - 100) * 10) / 10]));
    if (idx["00"] == null || Math.abs(idx["00"]) > 50) { console.log("НСИ: липсва общ ИПЦ", url); continue; }
    const i = cpi.monthly.findIndex((m) => m.period === period);
    if (i < 0) { cpi.monthly.push({ period, value: idx["00"] }); changed.push(`ИПЦ ${period}: ${idx["00"]}%`); }
    else if (cpi.monthly[i].value !== idx["00"]) { cpi.monthly[i].value = idx["00"]; changed.push(`ИПЦ ${period} поправен: ${idx["00"]}%`); }
    const rates = Object.fromEntries(Object.entries(GROUP).filter(([c]) => idx[c] != null).map(([c, id]) => [id, idx[c]]));
    if (Object.keys(rates).length === 13 && (!newestGroups || period > newestGroups.period)) newestGroups = { period, rates, url, label: `${hm[1]} ${hm[2]}` };
  }
  cpi.monthly.sort((a, b) => a.period.localeCompare(b.period));
  cpi.monthly = cpi.monthly.slice(-36);
  if (newestGroups && newestGroups.period >= cpi.groups.period) {
    if (JSON.stringify(cpi.groups.rates) !== JSON.stringify(newestGroups.rates) || cpi.groups.period !== newestGroups.period) changed.push(`групи по ИПЦ ${newestGroups.period}`);
    cpi.groups = { period: newestGroups.period, rates: newestGroups.rates };
    cpi.source = { title: `НСИ, Инфлация и индекси на потребителските цени, ${newestGroups.label}`, url: newestGroups.url };
  }
  if (changed.length === before) return;
  cpi.updated = today;
  save("cpi.json", cpi);
}

// ── БНБ ─────────────────────────────────────────────────────────────
async function bnb() {
  const cur = read("bnb-rates.json");
  const tmp = mkdtempSync(path.join(os.tmpdir(), "bnb-"));
  const d = new Date();
  for (let back = 1; back <= 3; back++) {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - back, 1));
    const ym = `${m.getUTCFullYear()}${String(m.getUTCMonth() + 1).padStart(2, "0")}`;
    const period = `${ym.slice(0, 4)}-${ym.slice(4)}`;
    if (period <= cur.period) break;
    const url = `https://bnb.bg/bnbweb/groups/public/documents/bnb_download/${ym}_s_irs_press_a1_bg.pdf`;
    const pdf = await get(url, true);
    if (!pdf || pdf.subarray(0, 4).toString() !== "%PDF") continue;
    const f = path.join(tmp, `${ym}.pdf`); writeFileSync(f, pdf);
    const t = execFileSync("pdftotext", ["-layout", f, "-"]).toString().replace(/\s+/g, " ");
    const num = (re) => { const x = t.match(re); return x ? Number(x[1]) : null; };
    const V = "(?:намалява|нараства|се повишава|се понижава|се увеличава|се намалява|остава(?: без промяна)?)";
    const consumer = num(new RegExp(`по кредитите за потребление ${V}[^%]{0,60}?(?:до |на )?(\\d+\\.\\d+)%`));
    const mortgage = num(new RegExp(`жилищните кредити средният лихвен процент ${V}[^%]{0,60}?(?:до |на )?(\\d+\\.\\d+)%`));
    const depH = t.match(new RegExp(`депозитите с договорен матуритет ${V}[^%]{0,60}?(?:до |на )?(\\d+\\.\\d+)%`));
    const deposit2 = depH ? Number(depH[1]) : null;
    const ok = (v, lo, hi) => v != null && v >= lo && v <= hi;
    if (!ok(consumer, 2, 20) || !ok(mortgage, 0.5, 10) || !ok(deposit2, 0, 8)) { console.log("БНБ: неразпознат текст", url, consumer, mortgage, deposit2); continue; }
    Object.assign(cur, { updated: today, period, mortgage, consumer, deposit: deposit2, source: { title: `БНБ, лихвена статистика, ${MONTHS[Number(ym.slice(4)) - 1]} ${ym.slice(0, 4)}`, url } });
    changed.push(`БНБ ${period}: жилищни ${mortgage}%, потребителски ${consumer}%, депозити ${deposit2}%`);
    save("bnb-rates.json", cur);
    break;
  }
}

// ── Евростат: дълг ──────────────────────────────────────────────────
async function debt() {
  const cur = read("debt.json");
  const j = await get("https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10dd_edpt1?geo=BG&unit=PC_GDP&sector=S13&na_item=GD&sinceTimePeriod=1995");
  if (!j) return console.log("Евростат: няма отговор");
  const o = JSON.parse(j); const idx = o.dimension.time.category.index;
  const series = Object.entries(idx).map(([y, i]) => ({ year: Number(y), value: o.value[i] })).filter((x) => typeof x.value === "number").sort((a, b) => a.year - b.year);
  if (series.length < 20) return console.log("Евростат: къса поредица");
  if (JSON.stringify(series) === JSON.stringify(cur.series)) return;
  changed.push(`дълг до ${series.at(-1).year}: ${series.at(-1).value}%`);
  save("debt.json", { updated: today, series });
}

for (const [n, f] of [["НСИ", nsi], ["БНБ", bnb], ["Евростат", debt]]) {
  try { await f(); } catch (e) { console.log(`${n}: грешка`, e.message); }
}
console.log(changed.length ? "Ново:\n" + changed.join("\n") : "Няма нови данни.");
