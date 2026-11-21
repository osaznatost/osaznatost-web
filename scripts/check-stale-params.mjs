// Седмична проверка за остарели ръчни параметри в lib/params.ts (инфлация на НСИ, лихви на БНБ и др.).
// Ако някой е по-стар от обичайния ритъм на публикуване, отваря (или допълва) задача в GitHub Issues.
// Нищо не се сменя автоматично: човек проверява първоизточника и обновява числото.
import { readFileSync } from "node:fs";

const src = readFileSync("lib/params.ts", "utf8");
const now = Date.now();
const days = (iso) => Math.floor((now - new Date(iso).getTime()) / 864e5);
const stale = [];

// Месечни поредици: НСИ публикува около 15-о число на следващия месец, БНБ — около 27-о.
const MONTHLY = { cpiYoY: ["Инфлация (НСИ)", 50], mortgageRate: ["Лихва по жилищни кредити (БНБ)", 62], consumerRate: ["Лихва по потребителски кредити (БНБ)", 62], depositRate: ["Лихва по депозити (БНБ)", 62] };
for (const [key, [label, max]] of Object.entries(MONTHLY)) {
  const m = src.match(new RegExp(`${key}: \\{[^}]*validFrom: "(\\d{4}-\\d{2}-\\d{2})"`));
  if (m && days(m[1]) > max) stale.push(`- ${label}: данни към ${m[1]} (${days(m[1])} дни)`);
}
const lastCpi = [...src.matchAll(/\["(\d{4}-\d{2})", -?[\d.]+\]/g)].map((m) => m[1]).filter((p) => p >= "2025").sort().at(-1);
if (lastCpi && days(`${lastCpi}-28`) > 50) stale.push(`- Месечна инфлация (CPI_MONTHLY): последен месец ${lastCpi}`);
// Годишни стойности: минималната заплата и осигурителните прагове се сменят от 1 януари.
for (const key of ["minWage", "maxInsurable"]) {
  const m = src.match(new RegExp(`${key}: \\{[^}]*validFrom: "(\\d{4})-`));
  if (m && Number(m[1]) < new Date().getFullYear()) stale.push(`- ${key}: валидно от ${m[1]} г. — провери за нов размер`);
}

if (!stale.length) { console.log("Няма остарели параметри."); process.exit(0); }
console.log(stale.join("\n"));
const repo = process.env.GITHUB_REPOSITORY;
if (!repo || !process.env.GITHUB_TOKEN) process.exit(0);
const H = { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json" };
const api = async (p, init = {}) => { const r = await fetch(`https://api.github.com/repos/${repo}/${p}`, { ...init, headers: { ...H, ...(init.headers ?? {}) } }); if (!r.ok) throw new Error(`${p}: ${r.status}`); return r.json(); };
const title = "Остарели параметри в lib/params.ts";
const open = (await api("issues?state=open&per_page=100")).find((i) => i.title === title);
const body = `Тези числа са по-стари от обичайния ритъм на публикуване. Провери първоизточника и обнови lib/params.ts:\n\n${stale.join("\n")}\n\n_Автоматична проверка всеки понеделник._`;
if (open) await api(`issues/${open.number}`, { method: "PATCH", body: JSON.stringify({ body }) });
else await api("issues", { method: "POST", body: JSON.stringify({ title, body }) });
