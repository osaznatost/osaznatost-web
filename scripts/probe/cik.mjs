import { execFileSync } from "node:child_process";
const post = (u, data) => { try { return execFileSync("curl", ["-sSL", "-m", "40", "-A", "Mozilla/5.0 (osaznatost)", ...data.flatMap((d) => ["--data-urlencode", d]), u], { maxBuffer: 1 << 26 }).toString("utf8"); } catch (e) { return "ERR"; } };
const get = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "40", "-A", "Mozilla/5.0 (osaznatost)", u], { maxBuffer: 1 << 26 }).toString("utf8"); } catch (e) { return ""; } };
const U = "https://iisda.government.bg/ras/adm_structures/ministry_organigram/88";
for (const id of ["GBHeadAdm-332", "GBPosition-349-", "position-14", "batchInfo-198", "unit-88"]) {
  const r = post(U, ["xjxfun=getAjaxInfo", `xjxargs[]=S${id}`]);
  console.log("PROBE", id, r.length, r.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").slice(0, 900));
}
for (const u of ["https://iisda.government.bg/ras/adm_structures/batch_info/88", "https://iisda.government.bg/ras/executive_power/ministries/88"]) { const h = get(u); console.log("PROBEU", u, h.length, h.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(1200, 2600)); }
