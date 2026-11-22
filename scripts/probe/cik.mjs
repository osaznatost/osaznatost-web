const UA = { "User-Agent": "osaznatost-bot/1.0 (+https://osaznatost-web.vercel.app)" };
async function get(u){for(let a=0;a<5;a++){try{const r=await fetch(u,{headers:UA,signal:AbortSignal.timeout(40000)});return [r.status,await r.text()];}catch(e){await new Promise(s=>setTimeout(s,10000));}}return [0,""];}
const nd=(t)=>JSON.parse(t.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)[1]);
const [,t]=await get("https://blagoevgrad.bg/header-menu/resheniia-na-obshtinski-suvet");
const d=nd(t); const all=[]; const walk=(xs)=>xs.forEach(x=>{all.push(x);walk(x.children??[])}); walk(d.props.headerItems);
const want=all.filter(x=>/resheni/.test(x.slug)); want.forEach(x=>console.log("## ITEM",x.id,x.slug,x.name,(x.children??[]).length));
console.log("## PAGEPROPS", JSON.stringify(Object.keys(d.props.pageProps??{})), JSON.stringify(d.props.pageProps).slice(0,800));
for (const x of want.filter(x=>/2026|2025/.test(x.slug))) {
  const [st,t2]=await get(`https://blagoevgrad.bg/category/${x.id}/${x.slug}`); console.log("## CAT",st,x.slug,t2.length);
  try{const p=nd(t2).props.pageProps; const s=JSON.stringify(p); console.log("## PP keys",Object.keys(p).join(","), s.length); console.log("## PP",s.slice(0,2500));
   const f=[...new Set([...s.matchAll(/[^"]*ckeditor_assets[^"]*|[^"]*\/uploads\/[^"]*/g)].map(m=>m[0]))]; console.log("## files",f.length); f.slice(0,10).forEach(z=>console.log("##  ",z));}catch(e){console.log("## noND",e.message)}
}
