// Проба: къде публикуват решения общинските съвети, които още не четем
const UA = { "User-Agent": "osaznatost-bot/1.0 (+https://osaznatost-web.vercel.app)" };
const urls = [
  "https://blagoevgrad.bg/", "https://blagoevgrad.bg/obshtinski-savet", "https://obs.blagoevgrad.bg/", "https://www.blagoevgrad.bg/bg/obshtinski-savet/resheniya",
  "https://www.plovdiv.bg/", "https://obs.plovdiv.bg/", "https://www.plovdiv.bg/item/obs/", "https://council.plovdiv.bg/",
  "https://www.vidin.bg/", "https://obs.vidin.bg/", "https://kustendil.bg/", "https://obs.kustendil.bg/",
  "https://www.smolyan.bg/", "https://obs.smolyan.bg/", "https://targovishte.bg/", "https://obs.targovishte.bg/", "https://silistra.egov.bg/", "https://www.silistra.bg/",
];
for (const u of urls) {
  try {
    const r = await fetch(u, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(25000) });
    const t = await r.text();
    const links = [...new Set([...t.matchAll(/href="([^"]+)"[^>]*>([^<]{0,80})/g)].filter((m) => /решени|съвет|obs|council|reshen/i.test(m[1] + m[2])).map((m) => `${m[1]} | ${m[2].trim()}`))].slice(0, 25);
    console.log("##", r.status, u, "->", r.url, t.length); links.forEach((l) => console.log("##   ", l));
  } catch (e) { console.log("## ERR", u, e.cause?.code ?? e.message); }
}
