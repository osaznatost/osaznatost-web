const H = { Origin: "https://www.parliament.bg", Referer: "https://www.parliament.bg/bg/bills", Accept: "application/json" };
const get = async (u) => { const r = await fetch(`https://www.parliament.bg/api/v1/${u}`, { headers: H }); const t = await r.text(); return [r.status, t]; };
for (const u of ["bill/166945", "bills/bg/0", "bill-list/bg/52", "fn-bills/bg", "bill/bg/166945"]) {
  try { const [s, t] = await get(u); console.log("=== " + u, s, t.slice(0, 2500)); } catch (e) { console.log(u, e.message); }
}
