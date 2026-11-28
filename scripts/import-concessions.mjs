// Националният концесионен регистър (nkr.government.bg): всички концесии и кой е концесионерът (име, ЕИК).
// 1) списъкът с партиди (страници по 20); 2) за всяка партида — обявлението за възложена концесия.
// Учтиво: 1 заявка на ~2 с; кеш в scripts/nkr-cache.json, за да не се чете отново прочетеното.
// Изход: data/concessions.json
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const B = "https://nkr.government.bg";
const UA = "osaznatost-bot/1.0 (+https://osaznatost.pavlin140.workers.dev)";
const MINUTES = Number(process.env.MINUTES ?? 50), PACE = Number(process.env.PACE ?? 2000), T0 = Date.now();
const CACHE = "scripts/nkr-cache.json";
const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : { lots: {}, notices: {} };
let cookie = "";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(path, opt = {}) {
  await sleep(PACE);
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(B + path, { ...opt, headers: { "user-agent": UA, cookie, "x-requested-with": "XMLHttpRequest", ...(opt.headers ?? {}) }, signal: AbortSignal.timeout(60000) });
      const sc = r.headers.getSetCookie?.() ?? [];
      if (sc.length) cookie = [...new Map([...cookie.split("; ").filter(Boolean), ...sc.map((c) => c.split(";")[0])].map((c) => [c.split("=")[0], c])).values()].join("; ");
      if (r.ok) return await r.text();
    } catch {}
    await sleep(5000);
  }
  return null;
}
const txt = (s) => s.replace(/<script.*?<\/script>|<style.*?<\/style>/gs, "").replace(/<[^>]+>/g, "\n").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n");
const time = () => (Date.now() - T0) / 60e3 < MINUTES;

// 1) списъкът
await get("/Concessions");
const today = new Date(); const dd = `${String(today.getDate()).padStart(2, "0")}.${String(today.getMonth() + 1).padStart(2, "0")}.${today.getFullYear()}`;
let html = await get("/Concessions/Search", { method: "POST", body: new URLSearchParams({ FromDate: "01.01.1990", ToDate: dd }), headers: { "content-type": "application/x-www-form-urlencoded" } });
const pages = Number(html?.match(/page=(\d+)">&gt;&gt;/)?.[1] ?? 1);
console.log(`Общо: ${html?.match(/Общо: (\d+)/)?.[1]}, страници: ${pages}`);
for (let p = 1; p <= pages && html; p++) {
  if (p > 1) html = await get(`/Concessions/Search?page=${p}`);
  if (!html) break;
  for (const tr of html.matchAll(/<tr>\s*<td class="idColumn[^>]*>([^<]+)<\/td>(.*?)<\/tr>/gs)) {
    const td = [...tr[2].matchAll(/<td[^>]*>(.*?)<\/td>/gs)].map((m) => txt(m[1]).trim());
    // № партида, статус, статус процедура, име, вид, предмет, праг, концедент, (скрити), свързана партида
    cache.lots[tr[1]] = { ...(cache.lots[tr[1]] ?? {}), reg: td[0], status: td[1], name: td[3], type: td[4], subject: td[5], conceder: td[7] };
  }
}
writeFileSync(CACHE, JSON.stringify(cache));
console.log(`Партиди: ${Object.keys(cache.lots).length}`);

// 2) обявленията за възложена концесия
const todo = Object.entries(cache.lots).filter(([, l]) => !l.checked);
let n = 0;
for (const [id, l] of todo) {
  if (!time()) break;
  const info = await get(`/ConcessionaireProcedures/ConcessionaireProcedureInfo/${id}`);
  if (!info) continue;
  l.notices = [...new Set([...info.matchAll(/\/Preview\/AssignedConcession\/([0-9a-f-]{36})/g)].map((m) => m[1]))];
  for (const nid of l.notices) {
    if (cache.notices[nid] || !time()) continue;
    const t = await get(`/Preview/AssignedConcession/${nid}`);
    if (!t) continue;
    const s = txt(t);
    const sec6 = s.split(/Раздел VI\. Информация за концесионера/)[1]?.split(/Раздел VII\./)[0] ?? "";
    const firms = [...sec6.matchAll(/Име\/Наименование:\s*\n\s*(.+?)\s*\n[\s\S]*?ЕИК[^\n]*\n\s*(?:ЕИК\s*)?([^\n]*)/g)].map((m) => ({ name: m[1].trim(), eik: (m[2].match(/\d{9,13}/) ?? [null])[0] }));
    const place = s.match(/Област:\s*([^,\n]+),\s*Община:\s*([^,\n]+)/);
    const val = s.match(/9\.6\.2\.[^\n]*\n\s*([\d\s.,]+)\s*(лв|BGN|EUR|€)/);
    const term = s.match(/[Сс]рок(?: на концесията)?[^\n]*\n\s*(\d+)\s*(годин|месец)/);
    cache.notices[nid] = { firms, oblast: place?.[1]?.trim() ?? null, obshtina: place?.[2]?.trim() ?? null, value: val ? `${val[1].trim()} ${val[2]}` : null, term: term ? `${term[1]} ${term[2].startsWith("год") ? "г." : "мес."}` : null };
  }
  l.checked = new Date().toISOString().slice(0, 10);
  if (++n % 50 === 0) writeFileSync(CACHE, JSON.stringify(cache));
}
writeFileSync(CACHE, JSON.stringify(cache));

// 3) изходът
const places = JSON.parse(readFileSync("data/places.json", "utf8")).oblasts;
const norm = (x) => (x ?? "").toLowerCase().replace(/^(община|общ\.)\s*/, "").replace(/\s+/g, " ").trim();
const muniCode = (obl, ob) => { for (const o of places) if (!obl || norm(o.name) === norm(obl)) for (const m of o.municipalities) if (norm(m.name) === norm(ob)) return m.code; return null; };
const items = Object.entries(cache.lots).map(([id, l]) => {
  const ns = (l.notices ?? []).map((x) => cache.notices[x]).filter(Boolean);
  const N = ns.at(-1);
  const byConceder = l.conceder?.match(/община\s+(.+)$/i)?.[1];
  return { id, reg: l.reg, status: l.status, name: l.name, type: l.type, subject: l.subject, conceder: l.conceder, firms: N?.firms ?? [], value: N?.value ?? null, term: N?.term ?? null, muni: muniCode(N?.oblast, N?.obshtina) ?? (byConceder ? muniCode(null, byConceder) : null) };
});
writeFileSync("data/concessions.json", JSON.stringify({ updated: new Date().toISOString().slice(0, 10), source: B, items }));
console.log(`Концесии: ${items.length}; с концесионер: ${items.filter((x) => x.firms.length).length}; с ЕИК: ${items.filter((x) => x.firms.some((f) => f.eik)).length}; прочетени: ${items.length - Object.values(cache.lots).filter((l) => !l.checked).length}`);
