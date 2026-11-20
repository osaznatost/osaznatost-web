import { execFileSync } from "node:child_process";
const get = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "120", "-A", "Mozilla/5.0 (osaznatost.bg; open data)", u], { maxBuffer: 1 << 28 }).toString(); } catch (e) { return ""; } };
const d = get("https://register.cacbg.bg/2026/DF695EED-A4D3-40A9-A1FC-C6E4C56C21C7231308.xml");
for (const m of d.matchAll(/<Table Num="([^"]+)" Description="([^"]+)" Declared="([^"]+)">([\s\S]*?)<\/Table>/g)) {
  console.log("## T", m[1], m[3], m[2]);
  const cells = [...m[4].matchAll(/<Cell Num="(\d+)"(?: Parent="([^"]*)")? Description="([^"]+)"/g)].map((c) => `${c[1]}:${c[2] ? c[2] + "/" : ""}${c[3]}`);
  console.log("    cols", cells.join(" | "));
  const vals = [...m[4].matchAll(/<Row Num="(\d+)">([\s\S]*?)<\/Row>/g)].map((r) => [...r[2].matchAll(/<Cell Num="\d+"[^>]*>([^<]*)<\/Cell>/g)].map((c) => c[1].trim()).join(" ; "));
  console.log("    rows", JSON.stringify(vals).slice(0, 400));
}
