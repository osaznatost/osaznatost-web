// Профилите на депутатите от parliament.bg (api/v1/mp-profile): биография, членства досега, законопроекти, контрол.
// Пише data/mp-profiles.json по номера на parliament.bg; съпоставянето с нашите номера е по име.
import { writeFileSync } from "node:fs";
const H = { Origin: "https://www.parliament.bg", Referer: "https://www.parliament.bg/", Accept: "application/json", "X-Requested-With": "XMLHttpRequest" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (u) => { for (let a = 0; a < 3; a++) { try { const r = await fetch(`https://www.parliament.bg/api/v1/${u}`, { headers: H }); if (r.ok) return await r.json(); } catch {} await sleep(1000 * (a + 1)); } return null; };
const ns = await get("coll-list-ns/bg");
const ids = [...new Set((ns?.colListMP ?? []).map((x) => x.A_ns_MP_id))];
console.log("депутати в списъка:", ids.length);
const T = (s) => (s ?? "").replace(/\s+/g, " ").trim();
const out = {};
for (const id of ids) {
  const p = await get(`mp-profile/bg/${id}`);
  await sleep(200);
  if (!p) { console.log("  няма профил", id); continue; }
  out[id] = {
    id, name: [p.A_ns_MPL_Name1, p.A_ns_MPL_Name2, p.A_ns_MPL_Name3].filter(Boolean).join(" "),
    born: p.A_ns_MP_BDate, bornIn: [T(p.A_ns_B_City), T(p.A_ns_B_Country)].filter(Boolean).join(", "),
    cv: T(p.A_ns_MPL_CV), spec: T(p.A_ns_MPL_Spec), prof: (p.prsList ?? []).map((x) => T(x.A_ns_MP_Pr_TL_value)).filter(Boolean),
    langs: (p.lngList ?? []).map((x) => T(Object.entries(x).find(([k]) => /TL_value$/.test(k))?.[1])).filter(Boolean),
    list: T(p.A_ns_CoalL_value), mir: T(p.A_ns_Va_name), img: p.A_ns_MP_img ? `https://www.parliament.bg/images/Assembly/${p.A_ns_MP_img}` : null,
    ms: (p.mshipList ?? []).map((m) => ({ c: T(m.A_ns_CL_value), pos: T(m.A_ns_MP_PosL_value), t: m.A_ns_CT_id, f: m.A_ns_MSP_date_F, to: m.A_ns_MSP_date_T })),
    bills: (p.importActList ?? []).length, billsList: (p.importActList ?? []).slice(0, 40).map((b) => ({ id: b.L_Act_id, sign: b.L_Act_sign, date: b.L_Act_date?.slice(0, 10), title: T(b.L_ActL_title ?? b.ANOT) })),
    control: (p.controlList ?? []).length, controlList: (p.controlList ?? []).slice(0, 15).map((c) => ({ date: c.DATE_DOC, about: T(c.ANOT) })),
    penalties: (p.penalty ?? []).length + (p.penaltyNsList ?? []).length + (p.penaltyColList ?? []).length,
    trips: (p.meetingList ?? []).length, expenses: (p.expenseList ?? []).length,
  };
}
writeFileSync("data/mp-profiles.json", JSON.stringify({ updated: new Date().toISOString().slice(0, 10), source: "https://www.parliament.bg/bg/MP", byId: out }));
console.log("профили:", Object.keys(out).length);
