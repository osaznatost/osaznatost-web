const H = { "user-agent": "Mozilla/5.0 osaznatost" };
const t = await (await fetch("https://shop.billa.at/suche/barilla", { headers: H })).text();
console.log("## scripts", [...t.matchAll(/<script([^>]*)>/g)].map((m) => m[1].slice(0, 80)).slice(0, 30));
for (const w of ["Spaghetti", "spaghetti", "00-", "perStandardizedQuantity", "regular"]) { const i = t.indexOf(w); console.log("## find", w, i, i > 0 ? t.slice(i - 200, i + 300).replace(/\s+/g, " ") : ""); }
