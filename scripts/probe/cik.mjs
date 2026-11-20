// Проба: публичните данни на „Наясно“ за местните избори (обработени от ЦИК)
const B = "https://storage.googleapis.com/data-electionsbg-com";
for (const c of ["2011_10_23_mi","2015_10_25_mi","2019_10_27_mi","2023_10_29_mi"]) {
  for (const f of ["index.json","municipalities/BLG03.json","regions_summary.json"]) {
    try { const r = await fetch(`${B}/${c}/${f}`); const t = await r.text(); console.log("PROBE", c, f, r.status, t.length, t.slice(0, 700).replace(/\s+/g," ")); }
    catch (e) { console.log("PROBE", c, f, "ERR", e.message); }
  }
}
