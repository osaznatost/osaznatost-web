// Обединява data/council/*.json с версията в origin/main преди запис: два паралелни процеса (редовното събиране и
// първоначалното събиране) могат да пишат един и същ файл; пазим всички решения и всички прочетени файлове от двете версии.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
const ref = process.argv[2] ?? "origin/main";
for (const f of readdirSync("data/council").filter((x) => x.endsWith(".json"))) {
  const p = `data/council/${f}`;
  let theirs; try { theirs = JSON.parse(execFileSync("git", ["show", `${ref}:${p}`], { maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }).toString()); } catch { continue; }
  const mine = JSON.parse(readFileSync(p, "utf8"));
  if (theirs.version !== mine.version) continue;
  const key = (d) => `${d.date.slice(0, 4)}-${d.number}`;
  const m = new Map(theirs.decisions.map((d) => [key(d), d]));
  for (const d of mine.decisions) m.set(key(d), d);
  const n0 = mine.decisions.length;
  mine.decisions = [...m.values()].sort((a, b) => b.date.localeCompare(a.date) || String(b.number).localeCompare(String(a.number), undefined, { numeric: true }));
  mine.files = { ...theirs.files, ...mine.files };
  mine.complete = !!(mine.complete || theirs.complete);
  if (mine.decisions.length !== n0) console.log(`${f}: ${n0} → ${mine.decisions.length} след обединяване`);
  writeFileSync(p, JSON.stringify(mine));
}
