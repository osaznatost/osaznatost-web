const html = await (await fetch("https://www.parliament.bg/bg/bills")).text();
const s = [...html.matchAll(/src="(\/js\/app[^"]+)"/g)][0][1];
const js = await (await fetch("https://www.parliament.bg" + s)).text();
const set = new Set();
for (const m of js.matchAll(/\.get\(([^)]{0,140})\)/g)) set.add(m[1].replace(/\s+/g, " "));
console.log([...set].filter((x) => /stan|report|stand|steno|sten/i.test(x)).join("\n"));
console.log("----"); console.log([...set].slice(0, 200).join("\n"));
