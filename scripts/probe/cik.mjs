import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const b = execFileSync("curl", ["-sSL", "-m", "90", "-A", "Mozilla/5.0 (osaznatost)", encodeURI("https://kardjali.bg/obs_re6enia/Resheniya_87 - 101_ot_21.05.2026 g..docx")], { maxBuffer: 1 << 28 });
writeFileSync("/tmp/k.docx", b);
const t = execFileSync("sh", ["-c", "unzip -p /tmp/k.docx word/document.xml | sed -e 's/<\\/w:p>/\\n/g; s/<[^>]*>//g'"], { maxBuffer: 1 << 28 }).toString();
console.log("PROBE", b.length, t.length); console.log("PROBE1", t.slice(0, 3500));
const i = t.indexOf("№ 88"); console.log("PROBE2", t.slice(i - 300, i + 1500));
