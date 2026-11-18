const H = { Origin: "https://www.parliament.bg", Referer: "https://www.parliament.bg/bg/bills", Accept: "application/json" };
const t = async (u) => { const r = await fetch(`https://www.parliament.bg/api/v1/${u}`, { headers: H }); const s = await r.text(); return `${r.status} ${s.startsWith("<!doctype") ? "HTML" : s.slice(0, 700)}`; };
for (const u of ["com-stan/23751", "cstan/23751", "standpoint/22614", "com-standpoint/22614", "pl-sten/11164", "plenary-st/11164", "steno/11164", "plenarysten/bg/11164", "com-steno/23751", "stan/23751", "comm-stan/bg/23751", "cmstan/23751"]) console.log("==", u, await t(u));
const b = await (await fetch("https://www.parliament.bg/api/v1/bill/166945", { headers: H })).json();
console.log(JSON.stringify(b.standp_list).slice(0, 800));
console.log(JSON.stringify(b.stan_list2_1).slice(0, 500));
console.log(JSON.stringify(b.proposal_12_list[0]).slice(0, 600));
