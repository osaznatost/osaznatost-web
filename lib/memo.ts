// Кеш в паметта за външни заявки (Supabase, новини): пази резултата за ttl милисекунди.
// Работи еднакво в Node и в Cloudflare Workers (там е за всеки екземпляр поотделно).
const store = new Map<string, { at: number; v: Promise<unknown> }>();
export function memo<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.v as Promise<T>;
  const v = fn().catch((e) => { store.delete(key); throw e; });
  store.set(key, { at: Date.now(), v });
  if (store.size > 2000) store.delete(store.keys().next().value!);
  return v;
}
export const HOUR = 3600_000, DAY = 24 * HOUR;
