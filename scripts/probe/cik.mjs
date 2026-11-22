const UA = { "User-Agent": "osaznatost-bot/1.0 (+https://osaznatost-web.vercel.app)" };
async function get(u){for(let a=0;a<5;a++){try{const r=await fetch(u,{headers:UA,signal:AbortSignal.timeout(40000)});return [r.status,await r.text()];}catch(e){console.log("## retry",e.cause?.code);await new Promise(s=>setTimeout(s,15000));}}return [0,""];}
for (const u of ["https://blagoevgrad.bg/header-menu/resheniia-2026-godina","https://blagoevgrad.bg/header-menu/arhiv-na-resheniia-2025"]) {
  const [st,t] = await get(u); console.log("##",st,u,t.length);
  const files=[...new Set([...t.matchAll(/[a-z]*\.?blagoevgrad\.bg\/ckeditor_assets\/[^"'\s\\]+|\/ckeditor_assets\/[^"'\s\\]+/g)].map(m=>m[0]))]; console.log("## files",files.length); files.slice(0,15).forEach(f=>console.log("##  ",f));
  for (const re of [/https?:\/\/[a-z.]*blagoevgrad\.bg\/[^"'\s\\]{0,140}/g, /Решени[ея][^"\\<]{0,160}/g, /"(?:href|src|file|url)\\?":\\?"[^"\\]{3,160}/g]) { const s=[...new Set([...t.matchAll(re)].map(m=>m[0]))]; console.log("## RE",re,s.length); s.slice(0,40).forEach(x=>console.log("##   ",x)); }
  const i=t.indexOf("resheniia-2026"); console.log("## CTX", t.slice(Math.max(0,t.lastIndexOf("self.__next_f",i)), i+2500).replace(/\s+/g," ").slice(0,3000));
}
