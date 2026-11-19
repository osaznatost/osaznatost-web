// Проба: какво връща parliament.bg за предишните парламенти на депутат.
const H = { "User-Agent": "Mozilla/5.0 osaznatost", Accept: "application/json" };
const j = async (u) => { const r = await fetch(`https://www.parliament.bg/api/v1/${u}`, { headers: H }); return r.ok ? r.json() : `HTTP ${r.status}`; };
const p = await j("mp-profile/bg/5335");
console.log(Object.keys(p));
for (const [k, v] of Object.entries(p)) if (Array.isArray(v)) console.log(k, v.length, JSON.stringify(v.slice(0, 3)).slice(0, 600));
for (const u of ["mp-profile/bg/5335/49", "coll-list-ns/bg/49", "mp-ns-list/bg", "ns-list/bg"]) { const x = await j(u); console.log(u, JSON.stringify(x).slice(0, 500)); }
