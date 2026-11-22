const UA = { "User-Agent": "osaznatost-bot/1.0 (+https://osaznatost-web.vercel.app)" };
for (const u of ["https://blagoevgrad.bg/sitemap"]) {
  let t="";for(let a=0;a<5&&!t;a++){try{t=await (await fetch(u,{headers:UA,signal:AbortSignal.timeout(40000)})).text();}catch(e){console.log("## retry",e.cause?.code);await new Promise(s=>setTimeout(s,15000));}}
  for (const re of [/admin\.blagoevgrad\.bg[^"'\s\\]{0,120}/g, /\/api\/[^"'\s\\]{0,100}/g, /"(?:slug|url|link|path)":"[^"]{0,140}"/g, /[^"\\]{0,60}(?:resheni|savet|suvet|reshen)[^"\\]{0,80}/gi]) {
    const s = [...new Set([...t.matchAll(re)].map((m) => m[0]))]; console.log("## RE", re, s.length); s.slice(0, 120).forEach((x) => console.log("##   ", x)); }
}
