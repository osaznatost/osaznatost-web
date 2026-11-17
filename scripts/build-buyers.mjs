// Определя къде се намира всеки възложител: област, община, населено място (ЕКАТТЕ) и ниво на властта.
// Ред на източниците: 1) ръчно проверени съответствия на „Наясно“ (MIT); 2) адресите в обявленията OCDS
// на ЦАИС ЕОП (от 2026 г.); 3) името на възложителя („Община Шумен“, „Район …“, „Областна администрация …“).
// Пуска се от GitHub Actions. Нужни тайни: SUPABASE_URL, SUPABASE_SECRET_KEY.

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY;
if (!URL_ || !KEY) throw new Error("Липсват SUPABASE_URL или SUPABASE_SECRET_KEY");
const HEAD = { apikey: KEY, "Content-Type": "application/json" };
const NAIASNO = "https://raw.githubusercontent.com/atanasster/electionsbg/main/data";
const EOP = "https://storage.eop.bg";

const norm = (s) => String(s ?? "").toLowerCase().replace(/["„“”'«»]/g, "").replace(/\s+/g, " ").trim();
const clean = (s) => norm(s).replace(/^(гр\.|град|с\.|село)\s*/, "").trim();

// ЕКАТТЕ
const ek = await (await fetch(`${NAIASNO}/ekatte_index.json`)).json();
const byEkatte = new Map(ek.map((x) => [x.ekatte, x]));
const byPostal = new Map();
const byName = new Map();
const muni = new Map();
for (const x of ek) {
  if (x.postal) (byPostal.get(x.postal) ?? byPostal.set(x.postal, []).get(x.postal)).push(x);
  (byName.get(norm(x.name)) ?? byName.set(norm(x.name), []).get(norm(x.name))).push(x);
  const m = muni.get(norm(x.obshtina)) ?? { code: x.obshtina_code, name: x.obshtina, province: x.province, seat: null, towns: [] };
  if (!x.is_village) m.towns.push(x);
  if (norm(x.name) === norm(x.obshtina) && !x.is_village) m.seat = x;
  muni.set(norm(x.obshtina), m);
}
for (const m of muni.values()) m.seat ??= m.towns[0] ?? null;
muni.set("столична", { ...muni.get("столична"), seat: ek.find((x) => x.name === "София" && !x.is_village) });
const sofia = muni.get("столична").seat;
const provinces = new Set(ek.map((x) => x.province));

// Ръчни съответствия на „Наясно“
const overrides = (await (await fetch(`${NAIASNO}/procurement/awarder_geo_overrides.json`)).json()).awarders ?? {};

// Адреси от OCDS (2026 г.)
const ocds = new Map();
const addDays = (d, n) => new Date(Date.parse(d) + n * 864e5).toISOString().slice(0, 10);
const yesterday = addDays(new Date().toISOString().slice(0, 10), -1);
const days = [];
for (let d = "2026-01-01"; d <= yesterday; d = addDays(d, 1)) days.push(d);
const ocdsKey = (day) => {
  const [y, m, d] = day.split("-");
  return `Автоматично генерирани данни за обявления, публикувани в ЦАИС ЕОП на ${d}.${m}.${y} г., съгласно стандарт OCDS.json`;
};
async function scan(day) {
  try {
    const res = await fetch(`${EOP}/open-data-${day}/${encodeURIComponent(ocdsKey(day))}`);
    if (!res.ok) return;
    const js = JSON.parse((await res.text()).replace(/^﻿/, ""));
    for (const r of js.releases ?? []) for (const p of r.parties ?? []) {
      if (!p.roles?.includes("buyer") || !p.identifier?.id || !p.address) continue;
      ocds.set(p.identifier.id, p.address);
    }
  } catch { /* денят се пропуска */ }
}
for (let i = 0; i < days.length; i += 8) await Promise.all(days.slice(i, i + 8).map(scan));
console.log(`OCDS: адреси на ${ocds.size} възложители`);

function fromAddress(a) {
  const loc = clean(a.locality);
  const cands = (a.postalCode && byPostal.get(String(a.postalCode))) || [];
  const hit = cands.find((x) => norm(x.name) === loc) ?? (cands.length === 1 ? cands[0] : null);
  if (hit) return hit;
  const named = byName.get(loc) ?? [];
  if (named.length === 1) return named[0];
  if (loc === "софия") return sofia;
  return null;
}

function fromName(name) {
  const n = norm(name);
  let m = n.match(/^(?:община|общинска администрация)\s+(.+)$/);
  if (m && muni.get(clean(m[1]))) return { s: muni.get(clean(m[1])).seat, how: "име: община" };
  m = n.match(/^район\s+/);
  if (m) return { s: sofia, how: "име: район на София" };
  m = n.match(/областна администрация\s*(?:-|–|на)?\s*(?:област\s+)?(.+)$/);
  if (m) {
    const p = [...provinces].find((x) => norm(x) === clean(m[1]) || norm(x).startsWith(clean(m[1])));
    if (p) return { s: null, oblast: p, how: "име: областна администрация" };
  }
  m = n.match(/(?:гр\.|град|с\.|село)\s*([а-я][а-я\- ]+?)(?:[,\-–(]|$)/);
  if (m) {
    const c = byName.get(clean(m[1])) ?? [];
    if (c.length === 1) return { s: c[0], how: "име: населено място" };
  }
  return null;
}

function level(name, type) {
  const n = norm(name);
  if (/областна администрация/.test(n)) return "областен";
  if (type === "Местен орган" || /^(община|район|кметство|общинска)/.test(n)) return "общински";
  if (/министерство|агенция|национал|държавн|комисия|народно събрание|президент|министерски съвет|прокуратура|съвет/.test(n) || /Централен|Национален/.test(type ?? "")) return "държавен";
  return "друг публичен";
}

// Всички възложители от базата. Четем направо договорите на страници по id (бързо по индекса),
// вместо агрегиращия изглед proc_buyer_stats, който при много години удря лимита за време.
const seen = new Map();
for (let last = ""; ;) {
  const res = await fetch(`${URL_}/rest/v1/proc_contracts?select=id,buyer_eik,buyer_name,buyer_type&order=id&limit=1000${last ? `&id=gt.${encodeURIComponent(last)}` : ""}`, { headers: HEAD });
  if (!res.ok) throw new Error(`buyers: HTTP ${res.status} ${await res.text()}`);
  const rows = await res.json();
  for (const r of rows) if (r.buyer_eik && !seen.has(r.buyer_eik)) seen.set(r.buyer_eik, { eik: r.buyer_eik, name: r.buyer_name, buyer_type: r.buyer_type });
  if (rows.length < 1000) break;
  last = rows[rows.length - 1].id;
}
const buyers = [...seen.values()];
console.log(`Възложители: ${buyers.length}`);

const out = [];
const stats = {};
for (const b of buyers) {
  if (!b.eik) continue;
  let s = null, oblast = null, how = null;
  const o = overrides[b.eik];
  if (o?.ekatte && byEkatte.get(o.ekatte)) { s = byEkatte.get(o.ekatte); how = "Наясно"; }
  if (!s && ocds.get(b.eik)) { s = fromAddress(ocds.get(b.eik)); if (s) how = "адрес в обявлението"; }
  if (!s) { const r = fromName(b.name); if (r) { s = r.s; oblast = r.oblast ?? null; how = r.how; } }
  stats[how ?? "неизвестно"] = (stats[how ?? "неизвестно"] ?? 0) + 1;
  out.push({
    eik: b.eik, name: b.name, buyer_type: b.buyer_type, level: level(b.name, b.buyer_type),
    ekatte: s?.ekatte ?? null, settlement: s?.name ?? null, is_village: s ? Boolean(s.is_village) : null,
    municipality: s?.obshtina ?? null, municipality_code: s?.obshtina_code ?? null, oblast: s?.province ?? oblast,
    geo_source: how, updated_at: new Date().toISOString(),
  });
}
console.log(stats);

for (let i = 0; i < out.length; i += 500) {
  const res = await fetch(`${URL_}/rest/v1/proc_buyers?on_conflict=eik`, {
    method: "POST", headers: { ...HEAD, Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(out.slice(i, i + 500)),
  });
  if (!res.ok) throw new Error(`proc_buyers: HTTP ${res.status} ${await res.text()}`);
}
console.log(`Записани: ${out.length}`);
