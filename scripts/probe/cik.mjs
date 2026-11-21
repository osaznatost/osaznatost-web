const H={"user-agent":"Mozilla/5.0 (osaznatost.bg; civic data)"};
const base="https://vratza.bg/%d0%b8%d0%b7%d0%b1%d0%be%d1%80%d0%b8-2/";
const re=/wp-content\/uploads\/\d{4}\/\d{2}\/(\d+)-(\d{2})_(\d{2})_(\d{4})/g;
const r1=await (await fetch(base,{headers:H})).text();
console.log("## p1 len",r1.length,"items",[...r1.matchAll(re)].length);
console.log("## pag", [...new Set([...r1.matchAll(/href="([^"]*(?:e-page|\/page\/)[^"]*)"/g)].map(m=>m[1]))].slice(0,10));
console.log("## epage", [...new Set([...r1.matchAll(/e-page-[0-9a-f]+/g)].map(m=>m[0]))]);
for (const u of [base+"?e-page-08b6494=2", base+"page/2/", base+"?paged=2"]) {
  const r=await fetch(u,{headers:H}); const t=await r.text(); const it=[...t.matchAll(re)].map(m=>m[1]);
  console.log("## try",u,r.status,"items",it.length,it.slice(0,3).join(","));
}
