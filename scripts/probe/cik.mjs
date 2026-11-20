import { execFileSync } from "node:child_process";
const get = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "40", "-A", "Mozilla/5.0 (osaznatost)", u], { maxBuffer: 1 << 26 }).toString("utf8"); } catch (e) { return ""; } };
const B = "https://iisda.government.bg";
const h = get(B + "/ras/adm_structures");
const links = [...new Set([...h.matchAll(/href="([^"]+)"[^>]*>([\s\S]{0,120}?)<\/a>/g)].map(([, a, t]) => a + " | " + t.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()))];
console.log("PROBE", h.length); for (const l of links.filter((l) => /ras\//.test(l)).slice(0, 60)) console.log("PROBE  ", l.slice(0, 170));
