for (const ds of ["prc_hicp_manr"]) {
  const u=`https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/${ds}?geo=BG&coicop=CP00&sinceTimePeriod=2025-09`;
  const j=await (await fetch(u)).json(); const idx=j.dimension.time.category.index;
  console.log("## "+ds, JSON.stringify(Object.entries(idx).sort((a,b)=>a[1]-b[1]).map(([t,i])=>[t,j.value[i]])));
}
const g=await (await fetch("https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_manr?geo=BG&coicop=CP07&coicop=CP01&coicop=CP04&sinceTimePeriod=2026-06")).json();
console.log("## groups", JSON.stringify(g.value).slice(0,300), JSON.stringify(g.dimension.coicop.category.index));
