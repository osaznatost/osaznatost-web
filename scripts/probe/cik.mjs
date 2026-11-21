const H={"user-agent":"Mozilla/5.0 (osaznatost.bg; civic data)"};
const base="https://vratza.bg/%d0%b8%d0%b7%d0%b1%d0%be%d1%80%d0%b8-2/?e-page-08b6494=";
for (const p of [9,10,11,150,297]) {
  const t=await (await fetch(base+p,{headers:H})).text();
  const i=t.indexOf("e-page-08b6494");
  const ups=[...new Set([...t.matchAll(/https:\/\/vratza\.bg\/wp-content\/uploads\/[^"']+\.(?:docx?|pdf|DOCX?|PDF)/g)].map(m=>m[0]))];
  console.log("## p",p,"uploads",ups.length, JSON.stringify(ups.slice(0,8)));
  const m=t.match(/(\d{1,4})\s*\/\s*(\d{2}\.\d{2}\.\d{4})/g); console.log("## nums",p,JSON.stringify((m||[]).slice(0,8)));
}
