import { execFileSync } from "node:child_process";
const post = (u, data) => { try { return execFileSync("curl", ["-sSL", "-m", "40", "-A", "Mozilla/5.0 (osaznatost)", ...data.flatMap((d) => ["--data-urlencode", d]), u], { maxBuffer: 1 << 26 }).toString("utf8"); } catch (e) { return "ERR"; } };
const U = "https://iisda.government.bg/ras/adm_structures/ministry_organigram/88";
for (const b of ["Btrue", "B1", "N1"]) {
  const r = post(U, ["xjxfun=getAjaxInfo", "xjxargs[]=SspecializedAdministration-88", `xjxargs[]=${b}`]);
  console.log("PROBE", b, r.length, r.slice(0, 1800).replace(/\s+/g, " "));
}
const r = post(U, ["xjxfun=getAjaxInfo", "xjxargs[]=SGBHeadAdm-332"]); console.log("PROBERAW", r.slice(0, 1500).replace(/\s+/g, " "));
