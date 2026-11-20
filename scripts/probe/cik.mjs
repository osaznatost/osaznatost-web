// Проба: достъпни ли са архивите на ЦИК за местните избори без браузър
const urls = ["https://results.cik.bg/mi2023/csv.zip","https://results.cik.bg/mi2019/csv.zip","https://results.cik.bg/minr2015/csv.zip","https://results.cik.bg/mipvr2011/csv.zip","https://results.cik.bg/mi2023/tur1/rezultati/index.html"];
for (const u of urls) {
  try { const r = await fetch(u, { headers: { "user-agent": "Mozilla/5.0 (osaznatost)" } }); const b = await r.arrayBuffer(); console.log(u, r.status, r.headers.get("content-type"), b.byteLength); }
  catch (e) { console.log(u, "ERR", e.message); }
}
