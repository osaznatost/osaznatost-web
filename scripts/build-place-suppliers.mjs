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
    const inq = `buyer_eik=in.(${eiks.slice(i, i + 40).map((e) => encodeURIComponent(`"${String(e).replace(/"/g, '\\"')}"`)).join(",")})`;
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

const ONLY = process.env.ONLY?.trim() ? new Set(process.env.ONLY.split(/[ ,]+/)) : null;
const queue = process.env.TOTALS_ONLY || process.env.RISK_ONLY ? [] : [...buyers.entries()].filter(([c]) => !ONLY || ONLY.has(c));
await Promise.all(Array.from({ length: 3 }, async () => { while (queue.length) { const [c, e] = queue.shift(); try { await one(c, e); } catch (err) { console.log("грешка", c, err.message); } } }));
console.log(`Готово: ${done} общини`);

// Общо по фирма за цялата страна (за „зависима от един възложител“ в червеното каре), на дялове по първите 2 цифри на ЕИК.
if (!process.env.ONLY && !process.env.RISK_ONLY) {
  const tot = new Map();
  let last = "", n = 0;
  for (;;) {
    const rows = await get(`proc_contracts?select=id,supplier_eiks,contract_value_eur${last ? `&id=gt.${encodeURIComponent(last)}` : ""}&order=id&limit=1000`);
    for (const c of rows) for (const e of new Set(c.supplier_eiks ?? [])) {
      if (!e) continue;
      const x = tot.get(e) ?? [0, 0];
      x[0]++; x[1] += c.contract_value_eur ?? 0;
      tot.set(e, x);
    }
    n += rows.length;
    if (rows.length < 1000) break;
    last = rows.at(-1).id;
  }
  const D = "data/proc/supplier-totals";
  mkdirSync(D, { recursive: true });
  const shards = {};
  for (const [e, [c, t]] of tot) ((shards[String(e).slice(0, 2).padEnd(2, "_")] ??= {})[e] = [c, Math.round(t)]);
  for (const [k, v] of Object.entries(shards)) writeFileSync(`${D}/${k}.json`, JSON.stringify(v));
  console.log(`Общо по фирма: ${tot.size} фирми от ${n} договора`);
}

// За червеното каре на общините: договорите с една оферта и договорите за проверката „нова фирма“ за последните 3 години.
// Заявките към изгледа proc_contracts_geo са бавни за големите общини (Пловдив, София) и от сайта изтичат; тук се правят веднъж на ден.
{
  const since = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 3); return d.toISOString().slice(0, 10); })();
  const RD = "data/proc/place-risk";
  mkdirSync(RD, { recursive: true });
  const codes = [...buyers.keys()].filter((c) => !ONLY || ONLY.has(c));
  let ok = 0;
  const q2 = [...codes];
  await Promise.all(Array.from({ length: 2 }, async () => {
    while (q2.length) {
      const code = q2.shift();
      try {
        const single = await get(`proc_contracts_geo?contract_date=gte.${since}&offers_count=eq.1&contract_value_eur=gt.0&order=contract_value_eur.desc.nullslast&limit=20&municipality_code=eq.${code}`);
        const lite = await get(`proc_contracts_geo?select=contract_date,contract_value_eur,supplier_eiks,supplier_names&municipality_code=eq.${code}&contract_date=gte.${since}&contract_value_eur=gte.30000&order=contract_date.desc&limit=2000`);
        writeFileSync(`${RD}/${code}.json`, JSON.stringify({ since, single, lite }));
        ok++;
      } catch (e) { console.log("place-risk грешка", code, e.message); }
    }
  }));
  console.log(`Рискове по общини: ${ok} от ${codes.length}`);
}
