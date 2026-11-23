// Пазач: проверява кога за последно е минало успешно всяко автоматично обновяване (content/feeds.json).
// Ако някое закъснява над допустимото, отваря (или обновява) един сигнал в GitHub Issues — собственикът получава известие по имейл.
// Когато всичко е наред, затваря сигнала.
import { readFileSync } from "node:fs";

const feeds = JSON.parse(readFileSync("content/feeds.json", "utf8"));
const repo = process.env.GITHUB_REPOSITORY;
const H = { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json" };
const api = async (p, init = {}) => { const r = await fetch(`https://api.github.com/repos/${repo}/${p}`, { ...init, headers: { ...H, ...(init.headers ?? {}) } }); if (!r.ok) throw new Error(`${p}: ${r.status}`); return r.json(); };

const late = [];
for (const f of feeds) {
  const { workflow_runs: runs } = await api(`actions/workflows/${f.file}/runs?per_page=20`);
  const ok = runs.find((r) => r.conclusion === "success");
  const hours = ok ? (Date.now() - new Date(ok.created_at).getTime()) / 36e5 : Infinity;
  const failedInRow = runs.findIndex((r) => r.conclusion === "success");
  const fails = (failedInRow === -1 ? runs : runs.slice(0, failedInRow)).filter((r) => r.conclusion === "failure").length;
  // GitHub понякога пропуска планираните пускания: закъснялото обновяване се пуска наново, ако в момента не върви
  if (hours > f.maxHours && !runs.some((r) => r.status === "in_progress" || r.status === "queued")) {
    const r = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${f.file}/dispatches`, { method: "POST", headers: H, body: JSON.stringify({ ref: "main" }) });
    console.log(r.ok ? "Пуснато наново:" : `Не можах да пусна (${r.status}):`, f.file);
  }
  if (hours > f.maxHours || fails >= 2) late.push(`- **${f.label}** (\`${f.file}\`): последно успешно ${ok ? `преди ${Math.round(hours)} ч.` : "няма"}; неуспешни опити подред: ${fails}. [Опитите](https://github.com/${repo}/actions/workflows/${f.file})`);
}

const TITLE = "Пазач: закъсняващо обновяване на данните";
const open = (await api(`issues?state=open&per_page=50`)).find((i) => i.title === TITLE);
if (late.length) {
  const body = `Проверка от ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC.\n\n${late.join("\n")}\n\nСтраницата „Състояние на данните“: /sastoyanie`;
  if (open) await api(`issues/${open.number}/comments`, { method: "POST", body: JSON.stringify({ body }) });
  else await api(`issues`, { method: "POST", body: JSON.stringify({ title: TITLE, body }) });
  console.log(`Закъсняват: ${late.length}`);
} else {
  if (open) {
    await api(`issues/${open.number}/comments`, { method: "POST", body: JSON.stringify({ body: "Всички обновявания отново минават навреме. Затварям." }) });
    await api(`issues/${open.number}`, { method: "PATCH", body: JSON.stringify({ state: "closed" }) });
  }
  console.log("Всичко е навреме.");
}
