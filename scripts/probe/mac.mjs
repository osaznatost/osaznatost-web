// Проба от български IP: сайтове на общински съвети, които отказват заявки от чужбина.
const get = async (u) => { try { const r = await fetch(u, { headers: { "user-agent": "Mozilla/5.0 (osaznatost)" } }); return [r.status, await r.text()]; } catch (e) { return ["ERR " + e.message, ""]; } };
const dec = (a) => { try { return decodeURI(a); } catch { return a; } };
for (const u of ["https://www.silistra.bg/", "https://www.targovishte.bg/", "https://www.vidin.bg/", "https://www.smolyan.bg/", "https://www.vratsa.bg/obshtinski-savet"]) {
  const [st, h] = await get(u);
  const links = [...new Set([...h.matchAll(/href="([^"]+)"[^>]*>([\s\S]{0,90}?)<\/a>/g)].map(([, a, t]) => dec(a) + " | " + t.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()).filter((l) => /реш|reshen|decision|obs|savet|съвет|council/i.test(l)))];
  console.log("PROBE", u, st, h.length);
  for (const l of links.slice(0, 8)) console.log("PROBE  ", l.slice(0, 160));
}
