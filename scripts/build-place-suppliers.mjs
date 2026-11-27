// Изпълнителите на възложителите във всяка община (сбор по фирма), записани като файлове data/proc/place-suppliers/<код>.json.
// Изгледът proc_place_suppliers е твърде бавен за големите общини (Бургас, София) и заявката от сайта изтича;
// затова сборът се прави тук, веднъж на ден, на страници по 1000 договора.
// Нужни тайни: SUPABASE_URL, SUPABASE_SECRET_KEY.
import { mkdirSync, writeFileSync } from "node:fs";

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY;
if (!URL_ || !KEY) throw new Error("Липсват SUPABASE_URL или SUPABASE_SECRET_KEY");
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const OUT = "data/proc/place-suppliers";
mkdirSync(OUT, { recursive: true });

async function get(path, tries = 4) {
  for (let i = 0; ; i++) {
    const r = await fetch(`${URL_}/rest/v1/${path}`, { headers: H });
    if (r.ok) return r.json();
    if (i >= tries) throw new Error(`${r.status} ${path.slice(0, 80)} ${(await r.text()).slice(0, 120)}`);
    await new Promise((s) => setTimeout(s, 3000 * (i + 1)));
  }
}

// възложители по община
const buyers = new Map();
for (let off = 0; ; off += 1000) {
  const rows = await get(`proc_buyers?select=eik,municipality_code&municipality_code=not.is.null&order=eik&limit=1000&offset=${off}`);
  for (const b of rows) (buyers.get(b.municipality_code) ?? buyers.set(b.municipality_code, []).get(b.municipality_code)).push(b.eik);
  if (rows.length < 1000) break;
}
console.log(`общини: ${buyers.size}, възложители: ${[...buyers.values()].reduce((a, x) => a + x.length, 0)}`);

let done = 0;
async function one(code, eiks) {
  const by = new Map();
  // по възложители на групи (индекс по buyer_eik), на страници по id
  for (let i = 0; i < eiks.length; i += 40) {
    const inq = `buyer_eik=in.(${eiks.slice(i, i + 40).join(",")})`;
    let last = "";
    for (;;) {
      const rows = await get(`proc_contracts?select=id,supplier_eiks,supplier_names,contract_value_eur&${inq}${last ? `&id=gt.${encodeURIComponent(last)}` : ""}&order=id&limit=1000`);
      for (const c of rows) (c.supplier_eiks ?? []).forEach((e, k) => {
        if (!e) return;
        const x = by.get(e) ?? { eik: e, name: c.supplier_names?.[k] ?? e, contracts: 0, total_eur: 0 };
        x.contracts++; x.total_eur += c.contract_value_eur ?? 0;
        if ((c.supplier_names?.[k] ?? "") > x.name) x.name = c.supplier_names[k];
        by.set(e, x);
      });
      if (rows.length < 1000) break;
      last = rows.at(-1).id;
    }
  }
  const list = [...by.values()].map((x) => ({ ...x, total_eur: Math.round(x.total_eur * 100) / 100 })).sort((a, b) => b.total_eur - a.total_eur);
  writeFileSync(`${OUT}/${code}.json`, JSON.stringify(list));
  if (++done % 25 === 0) console.log(`${done}/${buyers.size}`);
}

const queue = [...buyers.entries()];
await Promise.all(Array.from({ length: 3 }, async () => { while (queue.length) { const [c, e] = queue.shift(); try { await one(c, e); } catch (err) { console.log("грешка", c, err.message); } } }));
console.log(`Готово: ${done} общини`);
