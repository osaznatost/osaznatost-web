// BILLA Австрия: публичните страници на онлайн магазина (shop.billa.at/suche/<дума>) носят данните за продуктите
// в сериализиран Nuxt вид (__NUXT_DATA__). Декодираме го и взимаме име, марка, количество, редовна цена.
const UA = { "user-agent": "Mozilla/5.0 (osaznatost.bg; price comparison)" };
export function nuxtDecode(arr) {
  const memo = new Map();
  const res = (i) => {
    if (typeof i !== "number") return i;
    if (memo.has(i)) return memo.get(i);
    const v = arr[i];
    let out;
    if (Array.isArray(v)) {
      if (typeof v[0] === "string" && ["Reactive", "ShallowReactive", "Ref", "ShallowRef", "EmptyRef", "EmptyShallowRef", "NuxtError", "Set", "Map"].includes(v[0])) out = v[0] === "Set" || v[0] === "Map" ? v.slice(1).map(res) : res(v[1]);
      else { out = []; memo.set(i, out); for (const x of v) out.push(res(x)); return out; }
    } else if (v && typeof v === "object") { out = {}; memo.set(i, out); for (const [k, x] of Object.entries(v)) out[k] = res(x); return out; }
    else out = v;
    memo.set(i, out); return out;
  };
  return res(0);
}
export const billaAtSearch = (term) => billaSearch(`https://shop.billa.at/suche/${encodeURIComponent(term)}`);
/** Същата платформа и за BILLA Чехия. */
export const billaCzSearch = (term) => billaSearch(`https://shop.billa.cz/vyhledavani?q=${encodeURIComponent(term)}`);
export async function billaSearch(url) {
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(40000) });
  if (!r.ok) return null;
  const html = await r.text();
  const m = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  const root = nuxtDecode(JSON.parse(m[1]));
  const out = new Map();
  const walk = (o, d = 0) => {
    if (!o || typeof o !== "object" || d > 40) return;
    if (!Array.isArray(o) && typeof o.sku === "string" && o.price?.regular?.value && o.name) {
      out.set(o.sku, { sku: o.sku, name: o.name, brand: o.brand?.name ?? null, amount: +o.amount || null, unit: o.volumeLabelShort ?? null, price: o.price.regular.value / 100, perUnit: o.price.regular.perStandardizedQuantity / 100, baseUnit: o.price.baseUnitShort, promo: !!o.inPromotion, slug: o.slug });
      return;
    }
    for (const x of Array.isArray(o) ? o : Object.values(o)) walk(x, d + 1);
  };
  walk(root);
  return [...out.values()];
}
