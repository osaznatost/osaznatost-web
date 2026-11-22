const UA = { "User-Agent": "osaznatost-bot/1.0 (+https://osaznatost-web.vercel.app)" };
async function get(u){for(let a=0;a<5;a++){try{const r=await fetch(u,{headers:UA,signal:AbortSignal.timeout(40000)});return [r.status,await r.text()];}catch(e){await new Promise(s=>setTimeout(s,10000));}}return [0,""];}
const [,t]=await get("https://blagoevgrad.bg/header-menu/resheniia-2026-godina");
const nd=t.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/); if(nd) console.log("## NEXT_DATA", nd[1].slice(0,1500));
[...t.matchAll(/<script[^>]{0,300}>/g)].slice(0,40).forEach(m=>console.log("## TAG",m[0])); const srcs=[...t.matchAll(/src="([^"]+\.js[^"]*)"/g)].map(m=>m[1]).map(x=>x.startsWith("http")?x.replace("https://blagoevgrad.bg",""):x); console.log("## srcs",srcs.length);
for(const s of srcs){const [,js]=await get("https://blagoevgrad.bg"+s); const hits=[...new Set([...js.matchAll(/["'`](https?:\/\/[^"'`]{4,80}|\/api\/[^"'`]{0,80})["'`]/g)].map(m=>m[1]))].filter(h=>!/w3\.org|reactjs|nextjs|fontawesome|github/.test(h)); if(hits.length) console.log("##",s,hits.slice(0,30).join(" , "));
 const i=js.indexOf("header-menu"); if(i>0) console.log("## HM",s,js.slice(i-600,i+600).replace(/\s+/g," "));}
