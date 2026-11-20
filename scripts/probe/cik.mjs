const B = "https://storage.googleapis.com/data-electionsbg-com";
const shape = (v, d=0) => Array.isArray(v) ? `[${v.length}× ${v.length?shape(v[0],d+1):""}]` : v && typeof v==="object" ? (d>3?"{…}":"{"+Object.entries(v).map(([k,x])=>k+":"+shape(x,d+1)).join(", ")+"}") : JSON.stringify(v)?.slice(0,40);
for (const c of ["2011_10_23_mi","2023_10_29_mi"]) {
  const j = await (await fetch(`${B}/${c}/municipalities/BLG03.json`)).json();
  console.log("PROBE", c, shape(j));
  console.log("PROBE2", JSON.stringify(j.mayor?.round2 ?? j.mayor?.elected ?? null).slice(0,600));
  console.log("PROBE3", JSON.stringify(j.council).slice(0,1500));
}
