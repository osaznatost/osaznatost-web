import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const UA = { "User-Agent": "osaznatost-bot/1.0 (+https://osaznatost.pavlin140.workers.dev)" };
for (const u of process.argv.slice(2)) {
  try {
    const b = Buffer.from(await (await fetch(u, { headers: UA, signal: AbortSignal.timeout(60e3) })).arrayBuffer());
    writeFileSync("/tmp/x", b);
    const k = b.slice(0, 5).toString();
    let t = k === "%PDF-" ? execFileSync("pdftotext", ["-layout", "/tmp/x", "-"], { maxBuffer: 1 << 28 }).toString()
      : k.startsWith("PK") ? execFileSync("sh", ["-c", "unzip -p /tmp/x word/document.xml | sed -e 's/<\\/w:p>/\\n/g' -e 's/<[^>]*>//g'"], { maxBuffer: 1 << 28 }).toString()
      : b[0] === 0xd0 ? execFileSync("antiword", ["-w", "0", "/tmp/x"], { maxBuffer: 1 << 28 }).toString() : b.toString().replace(/<[^>]+>/g, " ");
    console.log("##", u.slice(0, 100), t.length);
    const ms = [...t.matchAll(/гласува|ГЛАСУВА|Гласува|„за“|„ЗА“|"за"/g)];
    for (const m of ms.slice(3, 6)) console.log(">>>", t.slice(Math.max(0, m.index - 200), m.index + 400).replace(/\s+/g, " "));
  } catch (e) { console.log("##", u, "ERR", e.message); }
}
