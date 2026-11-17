// Проба: какви полета има в отворените данни на ЦАИС ЕОП (договори, анекси, обявления OCDS).
import { writeFileSync } from "node:fs";
const BASE = "https://storage.eop.bg";
const days = ["2026-11-10", "2026-11-11", "2026-11-12"];
const kinds = {
  dogovori: (d, m, y) => `Автоматично генерирани данни за договори, публикувани в ЦАИС ЕОП на ${d}.${m}.${y}.json`,
  anexi: (d, m, y) => `Автоматично генерирани данни за анекси, публикувани в ЦАИС ЕОП на ${d}.${m}.${y}.json`,
  ocds: (d, m, y) => `Автоматично генерирани данни за обявления, публикувани в ЦАИС ЕОП на ${d}.${m}.${y} г., съгласно стандарт OCDS.json`,
};
const out = {};
for (const day of days) {
  const [y, m, d] = day.split("-");
  for (const [k, f] of Object.entries(kinds)) {
    if (out[k]) continue;
    const url = `${BASE}/open-data-${day}/${encodeURIComponent(f(d, m, y))}`;
    try {
      const r = await fetch(url);
      const text = await r.text();
      if (!r.ok) { console.log(k, day, r.status); continue; }
      const js = JSON.parse(text.replace(/^﻿/, ""));
      const arr = Array.isArray(js) ? js : js.releases ?? js.records ?? js.data ?? [js];
      out[k] = { day, url, total: arr.length, topKeys: Array.isArray(js) ? null : Object.keys(js), sample: arr.slice(0, 3) };
      // за OCDS: намери запис с награда и участници
      if (k === "ocds") {
        const withBids = arr.find((x) => x.bids || x.tender?.tenderers?.length || x.awards?.length);
        out[k].withAward = withBids ?? null;
        const keys = new Set();
        for (const x of arr) for (const kk of Object.keys(x)) keys.add(kk);
        out[k].releaseKeys = [...keys];
        const tags = {};
        for (const x of arr) for (const t of x.tag ?? []) tags[t] = (tags[t] ?? 0) + 1;
        out[k].tags = tags;
      }
      console.log("✓", k, day, arr.length);
    } catch (e) { console.log("✗", k, day, e.message); }
  }
}
writeFileSync("data/_probe/eop.json", JSON.stringify(out, null, 1));
