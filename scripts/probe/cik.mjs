const H={"user-agent":"Mozilla/5.0 (osaznatost.bg; civic data)"};
const t=await (await fetch("https://vratza.bg/%d0%b8%d0%b7%d0%b1%d0%be%d1%80%d0%b8-2/?e-page-08b6494=10",{headers:H})).text();
const i=t.indexOf("824 / 28.07.2026"); const j=t.indexOf("823 / 28.07.2026");
console.log("## gap",j-i);
console.log("## ROW", JSON.stringify(t.slice(i-1500,j+50).replace(/\s+/g," ")));
