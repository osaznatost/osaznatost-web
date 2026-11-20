import { execFileSync } from "node:child_process";
const get = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "120", "-A", "Mozilla/5.0 (osaznatost.bg; open data)", u], { maxBuffer: 1 << 28 }).toString(); } catch (e) { return ""; } };
const x = get("https://register.cacbg.bg/2026/list.xml");
const files = [...x.matchAll(/<xmlFile>([^<]+)<\/xmlFile>/g)].map((m) => m[1]);
const cats = [...x.matchAll(/<Category Name="([^"]+)"/g)].map((m) => m[1]);
console.log("## decl", files.length, "persons", (x.match(/<Person>/g) || []).length, "cats", cats.length, cats.slice(0, 40).join(" | "));
for (const f of [files[3], files[500]]) {
  const d = get("https://register.cacbg.bg/2026/" + f);
  console.log("## DECL", f, d.length);
  // елементи с „дял“, „фирма“, „ЕИК“, „участие“
  const tags = [...new Set([...d.matchAll(/<([A-Za-z_][\w.-]*)[\s>]/g)].map((m) => m[1]))];
  console.log("## tags", tags.length, tags.join(" "));
  console.log(d.slice(0, 1500));
  const i = d.search(/EIK|Eik|ЕИК|Company|Share|Interest/); console.log("## around", d.slice(Math.max(0, i - 800), i + 2500));
}
