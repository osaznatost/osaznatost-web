import { execFileSync } from "node:child_process";
const get = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "40", "-A", "Mozilla/5.0 (osaznatost)", u], { maxBuffer: 1 << 26 }).toString("utf8"); } catch (e) { return ""; } };
const js = get("https://iisda.government.bg/js/jit/organogram.js");
for (const k of ["ajax", "xajax_getAjaxInfo", "expand", "nodeWithChilds"]) { let i = -1; let n = 0; while ((i = js.indexOf(k, i + 1)) >= 0 && n++ < 3) console.log("PROBE", k, js.slice(Math.max(0, i - 400), i + 500).replace(/\s+/g, " ")); }
