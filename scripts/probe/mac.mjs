// Проба от български IP: сайтове на общински съвети, които отказват заявки от чужбина.
const get = async (u) => { try { const r = await fetch(encodeURI(dec(u)), { headers: { "user-agent": "Mozilla/5.0 (osaznatost)" } }); return [r.status, await r.text()]; } catch (e) { return ["ERR " + e.message + " " + (e.cause?.code ?? ""), ""]; } };
const dec = (a) => { try { return decodeURI(a); } catch { return a; } };
for (const u of ["https://vratza.bg/избори-2/", "http://www.silistra.bg/wps/portal/municipality-silistra/municipal-council"]) {
  const [st, h] = await get(u);
  const links = [...new Set([...h.matchAll(/href="([^"]+)"[^>]*>([\s\S]{0,90}?)<\/a>/g)].map(([, a, t]) => dec(a) + " | " + t.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()).filter((l) => /реш|reshen|decision|\.pdf|\.doc|protokol|протокол/i.test(l)))];
  console.log("PROBE", u, st, h.length);
  for (const l of links.slice(0, 30)) console.log("PROBE  ", l.slice(0, 160));
}
