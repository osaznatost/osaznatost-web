// Четене на файловете с данни (data/**/*.json) по време на работа на сайта.
// • В Node (изграждане, локално) — от диска, с кеш в паметта.
// • В Cloudflare Workers няма диск: файловете са качени като статични файлове под /_data/ (scripts/cf-assets.mjs)
//   и се четат през ASSETS. Затова всичко тук е асинхронно.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const isWorkers = () => typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

const node = new Map<string, unknown>();
function readNode<T>(rel: string): T | null {
  if (!node.has(rel)) {
    const f = path.join(process.cwd(), "data", rel);
    node.set(rel, existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null);
  }
  return node.get(rel) as T | null;
}

// Кеш в Workers: най-много MAX файла, най-старо ползваните се изхвърлят (паметта е 128 MB).
const MAX = 120;
const cache = new Map<string, Promise<unknown>>();
async function fetchAsset(rel: string): Promise<unknown> {
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { env } = await getCloudflareContext({ async: true });
  const r = await (env as unknown as { ASSETS: { fetch: (u: string) => Promise<Response> } }).ASSETS.fetch(`https://assets.local/_data/${rel}`);
  return r.ok ? r.json() : null;
}

/** Файл с данни по относителен път в data/ (напр. "local/index.json"); null, ако го няма. */
export function data<T>(rel: string): Promise<T | null> {
  if (!isWorkers()) return Promise.resolve(readNode<T>(rel));
  let p = cache.get(rel);
  if (p) { cache.delete(rel); cache.set(rel, p); return p as Promise<T | null>; }
  p = fetchAsset(rel).catch(() => { cache.delete(rel); return null; });
  cache.set(rel, p);
  if (cache.size > MAX) cache.delete(cache.keys().next().value!);
  return p as Promise<T | null>;
}
