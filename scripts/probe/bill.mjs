const html = await (await fetch("https://www.parliament.bg/bg/bills")).text();
const src = [...html.matchAll(/src="(\/js\/[^"]+)"/g)].map((m) => m[1]);
for (const s of src) {
  const js = await (await fetch("https://www.parliament.bg" + s)).text();
  console.log("FILE", s, js.length);
  for (const m of js.matchAll(/A_Cm_Stanid/g)) console.log("CTX", js.slice(Math.max(0, m.index - 200), m.index + 60).replace(/\s+/g, " "));
  for (const m of js.matchAll(/\/api\/v1/g)) console.log("API", js.slice(m.index - 40, m.index + 80).replace(/\s+/g, " "));
}
