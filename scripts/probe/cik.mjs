import { execFileSync } from "node:child_process";
const get = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "40", "-A", "Mozilla/5.0 (osaznatost)", u], { maxBuffer: 1 << 26 }).toString("utf8"); } catch (e) { return ""; } };
const dec = (a) => { try { return decodeURI(a); } catch { return a; } };
for (const u of ["https://appk.government.bg/", "https://appk.government.bg/bg/registar-na-publichnite-predpriyatiya", "https://data.egov.bg/organisation/datasets/resourceView/appk"]) {
  const h = get(u);
  const links = [...new Set([...h.matchAll(/href="([^"]+)"[^>]*>([\s\S]{0,100}?)<\/a>/g)].map(([, a, t]) => dec(a) + " | " + t.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()).filter((l) => /регист|предприят|registry|predpri|\.xls|\.csv|данни|борд|съвет/i.test(l)))];
  console.log("PROBE", u, h.length);
  for (const l of links.slice(0, 25)) console.log("PROBE  ", l.slice(0, 170));
}
