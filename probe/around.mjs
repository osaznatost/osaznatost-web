import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const UA = { "User-Agent": "osaznatost-bot/1.0 (+https://osaznatost.pavlin140.workers.dev)" };
const [u, re, n = "3", before = "700", after = "300"] = process.argv.slice(2);
const b = Buffer.from(await (await fetch(u, { headers: UA })).arrayBuffer()); writeFileSync("/tmp/x", b);
const t = b.slice(0, 5).toString() === "%PDF-" ? execFileSync("pdftotext", ["-layout", "/tmp/x", "-"], { maxBuffer: 1 << 28 }).toString() : b.toString();
const ms = [...t.matchAll(new RegExp(re, "g"))];
console.log("## N", ms.length);
for (const m of ms.slice(2, 2 + +n)) console.log(">>>", t.slice(Math.max(0, m.index - +before), m.index + +after).replace(/[ \t]+/g, " "));
