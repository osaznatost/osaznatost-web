import { execFileSync } from "node:child_process";
const sh = (c) => { try { return execFileSync("bash", ["-c", c], { maxBuffer: 1 << 26 }).toString(); } catch (e) { return "ERR " + (e.stderr?.toString() || e.message).slice(0, 300); } };
for (const u of ["https://register.cacbg.bg/", "https://www.accbg.bg/publichen-registri/registr-lica/", "https://www.bulnao.government.bg/bg/publichen-registr/"]) {
  const t = sh(`curl -sSL -m 40 -A 'Mozilla/5.0 (osaznatost.bg; open data)' -w '\\nHTTP %{http_code} %{url_effective}' '${u}'`);
  console.log("## ", u, t.length, t.slice(-120).replace(/\s+/g, " "));
  const links = [...t.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]{0,120}?)<\/a>/g)].map((m) => [m[1], m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()]);
  for (const [h, x] of links.slice(0, 70)) console.log("    ", x.slice(0, 70), "=>", h.slice(0, 150));
  console.log("    TEXT", t.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 600));
}
