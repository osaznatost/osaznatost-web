// Нощно обобщение на сигналите по фирма за значките в списъците („Кой печели най-много“ и др.).
// Пита самия сайт (/api/firm-signals) — същата сметка като карето в страницата на фирмата — за:
// първите 20 изпълнители във всяка община и всички фирми, свързани с длъжностни лица.
// Нужно: SITE_PASSWORD (вход в сайта). Обновява записите по-стари от DAYS дни, докато има време (MINUTES).
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";

const BASE = process.env.BASE ?? "https://osaznatost.pavlin140.workers.dev";
const PW = process.env.SITE_PASSWORD;
if (!PW) throw new Error("Липсва SITE_PASSWORD");
const COOKIE = `osz_auth=${createHash("sha256").update(PW).digest("hex")}`;
const MINUTES = Number(process.env.MINUTES ?? 50), DAYS = Number(process.env.DAYS ?? 7);
const T0 = Date.now(), today = new Date().toISOString().slice(0, 10);
const OUT = "data/proc/firm-signals";
mkdirSync(OUT, { recursive: true });

const eiks = new Set();
for (const f of readdirSync("data/proc/place-suppliers")) for (const s of JSON.parse(readFileSync(`data/proc/place-suppliers/${f}`, "utf8")).slice(0, 20)) if (/^\d{9,13}$/.test(s.eik)) eiks.add(s.eik);
// след изпълнителите — всички фирми, свързани с длъжностни лица (пряко или през общ съдружник)
if (existsSync("data/tr-links/by-firm")) for (const f of readdirSync("data/tr-links/by-firm")) for (const e of Object.keys(JSON.parse(readFileSync(`data/tr-links/by-firm/${f}`, "utf8")))) eiks.add(e);

const shards = {};
const load = (k) => (shards[k] ??= existsSync(`${OUT}/${k}.json`) ? JSON.parse(readFileSync(`${OUT}/${k}.json`, "utf8")) : {});
const old = (e) => { const x = load(e.slice(0, 2))[e]; return !x || !x[3] || (Date.parse(today) - Date.parse(x[3])) / 864e5 >= DAYS; };
const todo = [...eiks].filter(old);
console.log(`фирми: ${eiks.size}, за обновяване: ${todo.length}`);

let done = 0, fail = 0;
const batches = [];
for (let i = 0; i < todo.length; i += 5) batches.push(todo.slice(i, i + 5));
async function worker() {
  while (batches.length && (Date.now() - T0) / 60e3 < MINUTES) {
    const b = batches.shift();
    try {
      const r = await fetch(`${BASE}/api/firm-signals?eik=${b.join(",")}`, { headers: { Cookie: COOKIE, "User-Agent": "osaznatost-bot/1.0" }, signal: AbortSignal.timeout(90000) });
      if (!r.ok) { fail += b.length; continue; }
      const j = await r.json();
      for (const e of b) if (j[e]) { load(e.slice(0, 2))[e] = [j[e].n, j[e].high, j[e].kinds, today]; done++; } else fail++;
    } catch { fail += b.length; }
    if (done % 200 < 5) for (const [k, v] of Object.entries(shards)) writeFileSync(`${OUT}/${k}.json`, JSON.stringify(v));
  }
}
await Promise.all([worker(), worker()]);
for (const [k, v] of Object.entries(shards)) writeFileSync(`${OUT}/${k}.json`, JSON.stringify(v));
console.log(`Готово: ${done} обновени, ${fail} неуспешни, остават ${batches.length * 5}`);
