import { execFileSync } from "node:child_process";
const get = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "40", "-A", "Mozilla/5.0 (osaznatost)", u], { maxBuffer: 1 << 26 }).toString("utf8"); } catch { return ""; } };
const dec = (a) => { try { return decodeURI(a); } catch { return a; } };
for (const u of ["https://www.plovdiv.bg/общински-съвет/", "https://www.plovdiv.bg/общински-съвет/дневен-ред/"]) {
  const h = get(encodeURI(u));
  const all = [...new Set([...h.matchAll(/href="([^"]+)"/g)].map((m) => dec(m[1])).filter((a) => /реш|протокол|заседан|\.pdf|\.doc/i.test(a)))];
  console.log("PROBE", u, h.length);
  for (const l of all.slice(0, 30)) console.log("PROBE  ", l.slice(0, 200));
}
