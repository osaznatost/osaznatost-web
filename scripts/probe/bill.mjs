const html = await (await fetch("https://www.parliament.bg/bg/bills")).text();
const src = [...html.matchAll(/src="(\/js\/[^"]+)"/g)].map((m) => m[1]);
const set = new Set();
for (const s of src) { const js = await (await fetch("https://www.parliament.bg" + s)).text(); for (const m of js.matchAll(/["'`](\/?api\/v1\/[a-zA-Z0-9_\-\/]+)/g)) set.add(m[1]); }
console.log([...set].sort().join("\n"));
