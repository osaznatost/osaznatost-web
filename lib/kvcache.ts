// Споделен кеш за външни заявки (Supabase, новини) в Cloudflare KV: общ за всички екземпляри на сайта,
// за разлика от кеша в паметта. „Остаряла стойност + обновяване във фона“: читателят не чака бавна заявка,
// ако има запазен отговор, дори по-стар от ttl. Извън Cloudflare (изграждане, локално) KV няма и функцията просто вика fn.
type KV = { get(k: string, t: "json"): Promise<unknown>; put(k: string, v: string, o?: { expirationTtl?: number }): Promise<void> };
type Ctx = { env: { CACHE?: KV }; ctx: { waitUntil(p: Promise<unknown>): void } };

const isWorkers = () => typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

async function cf(): Promise<Ctx | null> {
  if (!isWorkers()) return null;
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const c = (await getCloudflareContext({ async: true })) as unknown as Ctx;
    return c.env.CACHE ? c : null;
  } catch { return null; }
}

/** Стойността от KV, ако я има (обновява се във фона след ttl секунди); иначе fn() и запис. Празни/неуспешни отговори не се пазят. */
export async function kvCached<T>(key: string, ttl: number, fn: () => Promise<T>, ok: (v: T) => boolean = () => true): Promise<T> {
  const c = await cf();
  if (!c) return fn();
  const k = key.length > 480 ? `h:${await sha(key)}` : key;
  const hit = (await c.env.CACHE!.get(k, "json").catch(() => null)) as { at: number; v: T } | null;
  const refresh = async () => {
    const v = await fn();
    if (ok(v)) await c.env.CACHE!.put(k, JSON.stringify({ at: Date.now(), v }), { expirationTtl: Math.max(ttl * 24, 86400) }).catch(() => {});
    return v;
  };
  if (hit) {
    if (Date.now() - hit.at > ttl * 1000) c.ctx.waitUntil(refresh().catch(() => {}));
    return hit.v;
  }
  return refresh();
}

async function sha(s: string) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, "0")).join("");
}
