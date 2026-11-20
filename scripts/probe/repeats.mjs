// Проверка на живо: повтарящи се поръчки (същото правило като lib/buyerAnalysis.ts → repeatedWork) за Община Ботевград.
const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SECRET_KEY;
const HEAD = { apikey: KEY };
const q = async (p) => { const r = await fetch(`${URL_}/rest/v1/${p}`, { headers: HEAD }); if (!r.ok) throw new Error(`${p}: ${r.status}`); return r.json(); };
const buyers = await q(`proc_buyers?select=eik,name&name=ilike.*${encodeURIComponent("Ботевград")}*`);
console.log("Възложители:", buyers.map((b) => `${b.eik} ${b.name}`).join(" | "));
const main = buyers.find((b) => /^община ботевград$/i.test(b.name.trim())) ?? buyers.find((b) => /община/i.test(b.name));
const cs = await q(`proc_contracts?select=id,tender_id,tender_name,contract_date,contract_number,contract_value_eur,supplier_names&buyer_eik=eq.${main.eik}&order=contract_date.asc&limit=5000`);
console.log("Договори на", main.name, ":", cs.length);
const STOP = new Set(["на", "за", "и", "в", "във", "от", "по", "с", "със", "към", "до", "при", "град", "гр", "община", "обект", "изпълнение", "строително", "строителни", "дейности", "услуги", "доставка", "доставки", "извършване", "процедура", "обособена", "позиция", "част", "на", "лот", "основен", "текущ"]);
const tokens = (s) => new Set((s.toLowerCase().replace(/[„“"'()\-–,.;:№\/]/g, " ").match(/[а-яa-z0-9]{3,}/g) ?? []).filter((w) => !STOP.has(w)).map((w) => w.slice(0, 7)));
const jac = (a, b) => { let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i || 1); };
const items = cs.filter((c) => c.tender_name && c.contract_date).map((c) => ({ c, t: tokens(c.tender_name), d: Date.parse(c.contract_date) }));
const used = new Set(); const out = [];
for (let i = 0; i < items.length; i++) {
  if (used.has(i) || items[i].t.size < 2) continue;
  const g = [i];
  for (let j = i + 1; j < items.length; j++) {
    if (used.has(j) || Math.abs(items[j].d - items[i].d) > 730 * 864e5) continue;
    if ((jac(items[i].t, items[j].t) >= 0.55 && items[i].c.tender_name !== items[j].c.tender_name) || (items[i].c.tender_name === items[j].c.tender_name && items[i].c.contract_number !== items[j].c.contract_number)) g.push(j);
  }
  const tenders = new Set(g.map((x) => items[x].c.tender_id || items[x].c.contract_date));
  const span = Math.max(...g.map((x) => items[x].d)) - Math.min(...g.map((x) => items[x].d));
  const years = g.map((x) => items[x].c.tender_name.match(/20\d\d/)?.[0]);
  const annual = years.every(Boolean) && new Set(years).size === g.length;
  if (g.length >= 2 && tenders.size >= 2 && span >= 90 * 864e5 && !annual) { g.forEach((x) => used.add(x)); out.push(g.map((x) => items[x].c)); }
}
out.sort((a, b) => b.length - a.length);
console.log("Групи повтарящи се поръчки:", out.length);
for (const g of out.slice(0, 15)) {
  console.log(`\n— ${g.length} договора, ${Math.round(g.reduce((s, c) => s + (c.contract_value_eur ?? 0), 0)).toLocaleString("bg-BG")} €`);
  for (const c of g) console.log(`   ${c.contract_date} | ${(c.contract_value_eur ?? 0).toFixed(0)} € | ${c.supplier_names?.[0] ?? ""} | ${c.tender_name.slice(0, 140)}`);
}
