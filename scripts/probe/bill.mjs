const H = { Origin: "https://www.parliament.bg", Referer: "https://www.parliament.bg/bg/bills", Accept: "application/json" };
const j = async (u) => { const r = await fetch(`https://www.parliament.bg/api/v1/${u}`, { headers: H }); try { return await r.json(); } catch { return null; } };
const b = await j("bill/166945");
console.log(Object.keys(b).join(","));
console.log(JSON.stringify({ file_list: b.file_list, order: b.order, union: b.union_list, trans: b.trans_list, static: b.static_file, stage: b.stage ?? null, dist: b.dist_list ?? null }).slice(0, 1500));
for (const k of Object.keys(b)) if (Array.isArray(b[k]) && b[k].length && !["imp_list"].includes(k)) console.log("ARR", k, JSON.stringify(b[k][0]).slice(0, 300));
for (const u of ["https://www.parliament.bg/bills/52/52-654-01-8.pdf", "https://www.parliament.bg/pub/cdocs/52-650-01-49.pdf", "https://www.parliament.bg/bg/bills/ID/166945"]) {
  const r = await fetch(u); console.log("FILE", u, r.status, r.headers.get("content-type"), (await r.arrayBuffer()).byteLength);
}
let ok = 0;
for (let id = 166900; id < 166960; id++) { const x = await j(`bill/${id}`); if (x?.L_Act_id) { ok++; console.log("ID", id, x.A_ns_folder, x.L_Act_sign, x.L_Act_date?.slice(0, 10), x.L_ActL_title?.slice(0, 90)); } }
console.log("ok", ok);
