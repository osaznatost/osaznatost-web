import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const { tallyAny, parseProtocol } = await import(process.cwd() + "/scripts/enrich-council-votes.mjs");
const UA = { "User-Agent": "osaznatost-bot/1.0 (+https://osaznatost.pavlin140.workers.dev)" };
for (const l of readFileSync("probe/cands.txt", "utf8").trim().split("\n")) {
  const [c, u] = l.split("|");
  try {
    const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(40e3) });
    const b = Buffer.from(await r.arrayBuffer());
    writeFileSync("/tmp/x", b);
    let t = "";
    const k = b.slice(0, 5).toString();
    if (k === "%PDF-") t = execFileSync("pdftotext", ["-layout", "/tmp/x", "-"], { maxBuffer: 1 << 28 }).toString();
    else if (k.startsWith("PK")) t = execFileSync("sh", ["-c", "unzip -p /tmp/x word/document.xml | sed 's/<[^>]*>/ /g'"], { maxBuffer: 1 << 28 }).toString();
    else if (b[0] === 0xd0) t = execFileSync("antiword", ["/tmp/x"], { maxBuffer: 1 << 28 }).toString();
    else t = b.toString().replace(/<[^>]+>/g, " ");
    const res = tallyAny(t);
    const i = t.search(/гласува|ГЛАСУВА|„за“|Против/);
    console.log("C", c, t.length, res ? JSON.stringify(res.tally) : "-", u.slice(0, 90), "|", i >= 0 ? t.slice(Math.max(0, i - 120), i + 220).replace(/\s+/g, " ") : "");
  } catch (e) { console.log("C", c, "ERR", e.message, u.slice(0, 90)); }
}
