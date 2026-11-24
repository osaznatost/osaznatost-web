// Събира графиците („cron“) от работните потоци в content/schedule.json за планировчика в Cloudflare (cf-worker.ts).
// GitHub често пропуска собствените си планирани пускания; Cloudflare ги пуска навреме чрез workflow_dispatch.
// Графикът се пише в коментар „# cf-cron: …“ във всеки поток (за да не се дублира с GitHub schedule).
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const out = {};
for (const f of readdirSync(".github/workflows").filter((x) => x.endsWith(".yml")).sort()) {
  const s = readFileSync(`.github/workflows/${f}`, "utf8");
  const crons = [...s.matchAll(/^\s*#\s*cf-cron:\s*"([^"]+)"/gm), ...s.matchAll(/^\s*- cron:\s*"([^"]+)"/gm)].map((m) => m[1]);
  if (crons.length && /workflow_dispatch/.test(s)) out[f] = [...new Set(crons)];
}
writeFileSync("content/schedule.json", JSON.stringify(out, null, 1) + "\n");
console.log(Object.keys(out).length, "потока в графика");
