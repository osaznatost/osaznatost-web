// Седмична проверка за остарели ръчни параметри в lib/params.ts (инфлация на НСИ, лихви на БНБ и др.).
// Ако някой е по-стар от обичайния ритъм на публикуване, отваря (или допълва) задача в GitHub Issues.
// Нищо не се сменя автоматично: човек проверява първоизточника и обновява числото.
import { readFileSync } from "node:fs";

const src = readFileSync("lib/params.ts", "utf8");
const now = Date.now();
const days = (iso) => Math.floor((now - new Date(iso).getTime()) / 864e5);
const stale = [];

// Месечни поредици (data/macro, обновяват се сами от import-macro): НСИ ~15-о число на следващия месец, БНБ ~27-о.
const cpi = JSON.parse(readFileSync("data/macro/cpi.json", "utf8"));
const bnb = JSON.parse(readFileSync("data/macro/bnb-rates.json", "utf8"));
const lastCpi = cpi.monthly.at(-1).period;
if (days(`${lastCpi}-28`) > 50) stale.push(`- Инфлация (НСИ): последен месец ${lastCpi} — автоматичното обновяване не е намерило нов месец`);
if (days(`${bnb.period}-28`) > 62) stale.push(`- Лихви (БНБ): последен месец ${bnb.period} — автоматичното обновяване не е намерило нов месец`);
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
