// Осигурява KV пространство „osaznatost-cache“ (споделен кеш за Supabase и новини) и го връзва в wrangler.jsonc като CACHE.
// Пуска се в deploy-cloudflare преди качването; идемпотентно.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const TITLE = "osaznatost-cache";
const run = (...a) => execFileSync("npx", ["wrangler", ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
let list = [];
try { list = JSON.parse(run("kv", "namespace", "list")); } catch (e) { console.warn("Списъкът с KV не се прочете:", e.message); }
let ns = list.find((x) => x.title === TITLE);
if (!ns) {
  const out = run("kv", "namespace", "create", TITLE);
  const id = out.match(/"id":\s*"([0-9a-f]{32})"/)?.[1] ?? out.match(/\b([0-9a-f]{32})\b/)?.[1];
  if (!id) { console.error(out); process.exit(1); }
  ns = { id, title: TITLE };
  console.log("Създадено KV", id);
}
const cfg = JSON.parse(readFileSync("wrangler.jsonc", "utf8"));
cfg.kv_namespaces = [{ binding: "CACHE", id: ns.id }];
writeFileSync("wrangler.jsonc", JSON.stringify(cfg, null, 2));
console.log("KV CACHE →", ns.id);
