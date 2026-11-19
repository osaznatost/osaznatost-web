// Седмична ръчна проверка на нечислови твърдения: събира заглавия с цитати на политици от медиите в „Новини“
// за последните 7 дни и отваря задача в GitHub Issues. Човек избира 1–3 твърдения и решава присъдата;
// готовата проверка се добавя в content/checks.json (claims) със източници. Скриптът не дава присъди.
const OUT = ["bta.bg", "bnr.bg", "bntnews.bg", "svobodnaevropa.bg", "capital.bg", "dnevnik.bg", "mediapool.bg", "factcheck.bg"];
const repo = process.env.GITHUB_REPOSITORY;
const H = { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json" };
const api = async (p, init = {}) => { const r = await fetch(`https://api.github.com/repos/${repo}/${p}`, { ...init, headers: { ...H, ...(init.headers ?? {}) } }); if (!r.ok) throw new Error(`${p}: ${r.status}`); return r.json(); };
const un = (s) => s.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").trim();

const since = Date.now() - 7 * 864e5;
const seen = new Set();
const items = [];
for (const d of OUT) {
  try {
    const r = await fetch(`https://news.google.com/rss/search?q=site:${d}+when:7d&hl=bg&gl=BG&ceid=BG:bg`, { headers: { "user-agent": "Mozilla/5.0 Osaznatost" } });
    const xml = await r.text();
    for (const [, it] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const title = un(it.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "").replace(/\s+-\s+[^-]*$/, "");
      const date = new Date(it.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? 0);
      const url = un(it.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "");
      // цитат („…“ или "…") плюс глагол за твърдение — кандидат за проверка
      if (date.getTime() < since || seen.has(title)) continue;
      if (!/[„"«].{8,}[“"»]/.test(title) && !/(заяви|твърди|обяви|каза|според)/i.test(title)) continue;
      seen.add(title);
      items.push({ title, url, date: date.toISOString().slice(0, 10), d });
    }
  } catch (e) { console.log(d, e.message); }
}
items.sort((a, b) => (a.date < b.date ? 1 : -1));
const list = items.slice(0, 40).map((x) => `- [ ] ${x.date} · ${x.d} · [${x.title.replace(/[[\]]/g, "")}](${x.url})`).join("\n");
const week = new Date().toISOString().slice(0, 10);
const body = `Кандидати за ръчна проверка на твърдения от седмицата до ${week} (${items.length} заглавия с цитат или твърдение; първите 40).

**Как:** изберете 1–3 проверими твърдения (факт, който може да се сравни с документ или данни). Решението за присъдата е на човек. Готовата проверка се добавя в \`content/checks.json\` → \`claims\` със \`sources\`, по правилата в /metodologiya#fakt. Еднакъв подход към всички партии: ако седмицата е избрана от една страна, добавете и твърдение от друга, ако има проверимо.

${list || "Тази седмица няма намерени кандидати."}`;
await api("issues", { method: "POST", body: JSON.stringify({ title: `Седмична проверка на твърдения (${week})`, body, labels: [] }) });
console.log("кандидати:", items.length);
