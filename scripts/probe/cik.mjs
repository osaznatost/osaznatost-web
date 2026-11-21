const H={"user-agent":"Mozilla/5.0 (osaznatost.bg; civic data)"};
const t=await (await fetch("https://blagoevgrad.bg/",{headers:H})).text();
const L=[...new Set([...t.matchAll(/href="([^"]+)"[^>]*>([^<]{0,60})/g)].filter(m=>/съвет|council|obs|reshen|решен|протокол/i.test(m[1]+m[2])).map(m=>m[1]+" | "+m[2].trim()))];
console.log("## L",JSON.stringify(L.slice(0,30)));
for (const u of ["https://blagoevgrad.bg/municipal_council","https://blagoevgrad.bg/obshtinski-suvet","https://blagoevgrad.bg/council"]) { const r=await fetch(u,{headers:H}); console.log("## ",u,r.status); }
