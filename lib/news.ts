import { cacheLife } from "next/cache";

/** Медии: агенции, обществени медии, разследващи и проверяващи факти. Новините идват през Google News по домейн, за да не зависим от формата на всяка емисия. */
export const OUTLETS: { id: string; name: string; domain: string; kind: string }[] = [
  { id: "bta", name: "БТА", domain: "bta.bg", kind: "Национална информационна агенция" },
  { id: "bnr", name: "БНР", domain: "bnr.bg", kind: "Обществено радио" },
  { id: "bnt", name: "БНТ", domain: "bntnews.bg", kind: "Обществена телевизия" },
  { id: "rfe", name: "Свободна Европа", domain: "svobodnaevropa.bg", kind: "Обществена медия (финансирана от САЩ)" },
  { id: "capital", name: "Капитал", domain: "capital.bg", kind: "Икономически седмичник" },
  { id: "dnevnik", name: "Дневник", domain: "dnevnik.bg", kind: "Ежедневник" },
  { id: "mediapool", name: "Mediapool", domain: "mediapool.bg", kind: "Новинарски сайт" },
  { id: "factcheck", name: "Factcheck.bg", domain: "factcheck.bg", kind: "Проверка на факти" },
];

export type NewsItem = { title: string; url: string; date: string; outlet: string };
const unesc = (s: string) => s.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

async function feed(o: (typeof OUTLETS)[number]): Promise<NewsItem[]> {
  try {
    const r = await fetch(`https://news.google.com/rss/search?q=site:${o.domain}&hl=bg&gl=BG&ceid=BG:bg`, { headers: { "user-agent": "Mozilla/5.0 Osaznatost" } });
    if (!r.ok) return [];
    const xml = await r.text();
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 25).map(([, it]) => {
      const t = unesc(it.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
      return { title: t.replace(new RegExp(`\\s+-\\s+[^-]*$`), ""), url: unesc(it.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? ""), date: new Date(it.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? 0).toISOString(), outlet: o.id };
    }).filter((x) => x.title && x.url);
  } catch {
    return [];
  }
}

export async function latestNews() {
  "use cache";
  cacheLife("hours");
  const all = (await Promise.all(OUTLETS.map(feed))).flat();
  return all.sort((a, b) => (a.date < b.date ? 1 : -1));
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
  { re: /безработ/i, label: "Безработицата", href: "/statistiki/unemployment" },
  { re: /имот|жилищ|наем/i, label: "Жилища срещу наеми", href: "/statistiki/analiz#zhilishta" },
];

/** Последните споменавания на човек в медиите от списъка горе (Google News, търсене по точното име). */
export async function mentionsOf(fullName: string): Promise<NewsItem[]> {
  "use cache";
  cacheLife("days");
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
