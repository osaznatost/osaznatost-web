const key = (d) => { const [y, m, dd] = d.split("-"); return `Автоматично генерирани данни за обявления, публикувани в ЦАИС ЕОП на ${dd}.${m}.${y} г., съгласно стандарт OCDS.json`; };
const d = "2026-11-10";
const r = await fetch(`https://storage.eop.bg/open-data-${d}/${encodeURIComponent(key(d))}`);
const rel = JSON.parse((await r.text()).replace(/^﻿/, "")).releases;
const t = rel.find((x) => x.tag?.includes("tender"));
const walk = (o, p = "", out = []) => { if (o && typeof o === "object") { for (const [k, v] of Object.entries(o)) walk(v, p ? `${p}.${k}` : k, out); } else out.push(`${p}=${String(o).slice(0, 80)}`); return out; };
console.log(walk(t).filter((l) => !/parties\.\d+\.(address|contactPoint)/.test(l)).slice(0, 120).join("\n"));
const a = rel.find((x) => x.tag?.includes("tenderAmendment"));
console.log("=====AMEND"); console.log(walk(a).slice(0, 80).join("\n"));
