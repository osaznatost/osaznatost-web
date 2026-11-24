import { kvCached } from "@/lib/kvcache";
import { DAY, HOUR, memo } from "@/lib/memo";

/** Медии: агенции, обществени медии, разследващи и проверяващи факти. Новините идват през Google News по домейн, за да не зависим от формата на всяка емисия. */
export const OUTLETS: { id: string; name: string; domain: string; kind: string; rss?: string }[] = [
  { id: "bta", name: "БТА", domain: "bta.bg", kind: "Национална информационна агенция" },
  { id: "bnr", name: "БНР", domain: "bnr.bg", kind: "Обществено радио" },
  { id: "bnt", name: "БНТ", domain: "bntnews.bg", kind: "Обществена телевизия", rss: "https://bntnews.bg/bg/rss/news" },
  { id: "rfe", name: "Свободна Европа", domain: "svobodnaevropa.bg", kind: "Обществена медия (финансирана от САЩ)" },
  { id: "capital", name: "Капитал", domain: "capital.bg", kind: "Икономически седмичник", rss: "https://www.capital.bg/rss/" },
  { id: "dnevnik", name: "Дневник", domain: "dnevnik.bg", kind: "Ежедневник", rss: "https://www.dnevnik.bg/rss/" },
  { id: "mediapool", name: "Mediapool", domain: "mediapool.bg", kind: "Новинарски сайт", rss: "https://www.mediapool.bg/rss/" },
  { id: "factcheck", name: "Factcheck.bg", domain: "factcheck.bg", kind: "Проверка на факти", rss: "https://factcheck.bg/feed/" },
];

export type NewsItem = { title: string; url: string; date: string; outlet: string; image?: string };
const UA = "osaznatost-bot/1.0 (+https://osaznatost.pavlin140.workers.dev)";
const unesc = (s: string) => s.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

const tag = (it: string, t: string) => unesc(it.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`))?.[1] ?? "");
const httpsImg = (u?: string | null) => (u && /^https:\/\/[^\s"'<>]+$/.test(u) ? u : undefined);

/** Собствената емисия на медията: дава истинския адрес на статията и често корицата ѝ. */
async function native(o: (typeof OUTLETS)[number]): Promise<NewsItem[]> {
  const r = await fetch(o.rss!, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) return [];
  const xml = await r.text();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 30).map(([, it]) => {
    const img = it.match(/<enclosure[^>]*url="([^"]+)"[^>]*>/)?.[1] ?? it.match(/<media:(?:content|thumbnail)[^>]*url="([^"]+)"/)?.[1] ?? unesc(it).match(/<img[^>]*src="([^"]+)"/)?.[1];
    const d = new Date(tag(it, "pubDate") || tag(it, "dc:date") || 0);
    return { title: tag(it, "title"), url: tag(it, "link"), date: (isNaN(+d) ? new Date(0) : d).toISOString(), outlet: o.id, image: httpsImg(img ? unesc(img) : null) };
  }).filter((x) => x.title && /^https?:/.test(x.url) && x.date > "2000");
}

async function google(o: (typeof OUTLETS)[number]): Promise<NewsItem[]> {
  const r = await fetch(`https://news.google.com/rss/search?q=site:${o.domain}&hl=bg&gl=BG&ceid=BG:bg`, { headers: { "user-agent": "Mozilla/5.0 Osaznatost" } });
  if (!r.ok) return [];
  const xml = await r.text();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 25).map(([, it]) => {
    const t = unesc(it.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
    return { title: t.replace(new RegExp(`\\s+-\\s+[^-]*$`), ""), url: unesc(it.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? ""), date: new Date(it.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? 0).toISOString(), outlet: o.id };
  }).filter((x) => x.title && x.url);
}

async function feed(o: (typeof OUTLETS)[number]): Promise<NewsItem[]> {
  try {
    if (o.rss) { const n = await native(o).catch(() => []); if (n.length) return n; }
    return await google(o);
  } catch {
    return [];
  }
}

/** Корицата на статията (og:image) от страницата на медията; пази се 30 дни за всеки адрес. Снимката остава на сървъра на медията. */
function cover(url: string): Promise<string | null> {
  return kvCached(`news:img:${url}`, 30 * 86400, async () => {
    try {
      const r = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(5000) });
      if (!r.ok) return null;
      const html = (await r.text()).slice(0, 150000);
      const m = html.match(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
      return httpsImg(m ? unesc(m[1]) : null) ?? null;
    } catch { return null; }
  });
}

async function withCovers(items: NewsItem[]) {
  const need = items.filter((x) => !x.image && OUTLETS.find((o) => o.id === x.outlet)?.rss && !x.url.includes("news.google.")).slice(0, 60);
  for (let i = 0; i < need.length; i += 8) await Promise.all(need.slice(i, i + 8).map(async (x) => { x.image = (await cover(x.url)) ?? undefined; }));
  return items;
}

export function latestNews() {
  return memo("news", HOUR, () => kvCached("news:latest2", 1800, async () => {
    const all = (await Promise.all(OUTLETS.map(feed))).flat();
    return withCovers(all.sort((a, b) => (a.date < b.date ? 1 : -1)));
  }, (v) => v.length > 0));
}

/** Теми, по които на сайта има обективни данни: новината се свързва със съответната страница. */
export const CONTEXT: { re: RegExp; label: string; href: string }[] = [
  { re: /бюджет/i, label: "Бюджетът: числата", href: "/byudzhet" },
  { re: /дълг/i, label: "Държавният дълг", href: "/pari/dalg" },
  { re: /горив|бензин|дизел/i, label: "Горивата спрямо Европа", href: "/statistiki/analiz#goriva" },
  { re: /инфлаци|поскъп|цени/i, label: "Инфлацията", href: "/statistiki/inflation" },
  { re: /заплат|минимална/i, label: "Какво купува заплатата", href: "/ikonomika/pokupatelna-sila" },
  { re: /поръчк|търг/i, label: "Обществените поръчки", href: "/porachki" },
  { re: /еврофонд|ПВУ|План за възстановяване|RESTORE/i, label: "Евросредствата", href: "/ikonomika/evrosredstva" },
  { re: /Магнитски|санкци/i, label: "Санкциите за корупция", href: "/proverki/sankcii" },
  { re: /парламент|депутат|Народното събрание|гласува/i, label: "Гласуванията", href: "/parlament" },
  { re: /данък|ДДС|осигуров/i, label: "Данъците по пътя", href: "/kalkulatori/danaci" },
  { re: /пенси/i, label: "Каква пенсия ще получа", href: "/kalkulatori/pensiya" },
  { re: /майчинств|болнич/i, label: "Майчинство и болничен", href: "/kalkulatori/obezshteteniya" },
  { re: /безработ/i, label: "Безработицата", href: "/statistiki/unemployment" },
  { re: /имот|жилищ|наем/i, label: "Жилища срещу наеми", href: "/statistiki/analiz#zhilishta" },
];

/** Последните споменавания на човек в медиите от списъка горе (Google News, търсене по точното име). */
export function mentionsOf(fullName: string): Promise<NewsItem[]> {
  return memo(`m:${fullName}`, DAY, () => kvCached(`news:m:${fullName}`, 12 * 3600, () => mentionsOfRaw(fullName)));
}
async function mentionsOfRaw(fullName: string): Promise<NewsItem[]> {
  const q = `"${fullName}" (${OUTLETS.map((o) => `site:${o.domain}`).join(" OR ")})`;
  try {
    const r = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=bg&gl=BG&ceid=BG:bg`, { headers: { "user-agent": "Mozilla/5.0 Osaznatost" }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const xml = await r.text();
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 8).map(([, it]) => {
      const src = unesc(it.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ?? "");
      const t = unesc(it.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "").replace(/\s+-\s+[^-]*$/, "");
      return { title: t, url: unesc(it.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? ""), date: new Date(it.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? 0).toISOString().slice(0, 10), outlet: src };
    }).filter((x) => x.title && x.url);
  } catch {
    return [];
  }
}
