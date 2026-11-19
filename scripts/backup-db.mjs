// Седмично архивно копие на таблиците с обществените поръчки в Supabase (останалите данни са в git).
// Пише backup/<таблица>.jsonl.gz; работният процес ги качва като архив (artifact) за 35 дни.
// Нужни тайни: SUPABASE_URL, SUPABASE_SECRET_KEY. Само чете.
import { createWriteStream, mkdirSync } from "node:fs";
import { createGzip } from "node:zlib";

const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SECRET_KEY;
if (!URL_ || !KEY) throw new Error("Липсват SUPABASE_URL или SUPABASE_SECRET_KEY");
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const TABLES = [["proc_contracts", "id"], ["proc_annexes", "id"], ["proc_buyers", "eik"], ["proc_import_state", "feed"]];
const PAGE = 1000;
mkdirSync("backup", { recursive: true });

for (const [t, key] of TABLES) {
  const gz = createGzip(); const out = createWriteStream(`backup/${t}.jsonl.gz`); gz.pipe(out);
  let n = 0, last = null, offset = 0;
  for (;;) {
    // по ключ (бързо и стабилно); таблица без ясен ключ — по отместване
    const q = key ? `select=*&order=${key}.asc&limit=${PAGE}${last != null ? `&${key}=gt.${encodeURIComponent(last)}` : ""}` : `select=*&limit=${PAGE}&offset=${offset}`;
    let rows;
    for (let a = 0; ; a++) {
      const r = await fetch(`${URL_}/rest/v1/${t}?${q}`, { headers: H });
      if (r.ok) { rows = await r.json(); break; }
      if (a >= 4) throw new Error(`${t}: ${r.status} ${await r.text()}`);
      await new Promise((s) => setTimeout(s, 3000 * (a + 1)));
    }
    for (const row of rows) gz.write(JSON.stringify(row) + "\n");
    n += rows.length; offset += rows.length;
    if (rows.length < PAGE) break;
    if (key) last = rows.at(-1)[key];
  }
  gz.end(); await new Promise((r) => out.on("finish", r));
  console.log(`${t}: ${n} реда`);
}
