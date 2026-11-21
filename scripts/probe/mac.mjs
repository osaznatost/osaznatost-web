import { execFileSync } from "node:child_process";
const get = (u) => { try { return execFileSync("curl", ["-sSL", "-m", "120", "-A", "Mozilla/5.0 (osaznatost.bg; open data)", u], { maxBuffer: 1 << 28 }).toString(); } catch (e) { return ""; } };
const x = get("https://register.cacbg.bg/2026/list.xml");
const cats = [...x.matchAll(/<Category Name="([^"]*)">([\s\S]*?)<\/Category>/g)];
console.log("## cats", cats.map((c) => `${c[1]}:${(c[2].match(/<xmlFile>/g) || []).length}`).join(" | "));
for (const c of cats.filter((c) => /съветни|кмет/i.test(c[1])).slice(0, 2)) {
  const files = [...c[2].matchAll(/<xmlFile>([^<]+)<\/xmlFile>/g)].map((m) => m[1]).slice(0, 6);
  for (const f of files) {
    const d = get("https://register.cacbg.bg/2026/" + f);
    const root = (d.match(/<(\w+)[^>]*>\s*<Declarant|<(\w*Dekl\w*)/) || []).slice(1).filter(Boolean)[0];
    const tables = [...d.matchAll(/<Table Num="([^"]+)" Description="([^"]{0,60})[^"]*" Declared="([^"]+)"/g)].map((t) => `${t[1]}${t[3] === "True" ? "*" : ""}:${t[2].slice(0, 25)}`);
    console.log("## ", c[1], f, d.length, root, d.slice(0, 200).replace(/\s+/g, " "));
    console.log("    ", tables.join(" | ").slice(0, 900));
  }
}
