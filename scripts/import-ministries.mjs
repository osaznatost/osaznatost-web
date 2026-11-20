// Министерствата: ръководство, структура, щатове и агенциите към тях.
// Източник: Административен регистър (iisda.government.bg) — официалният регистър на държавната администрация.
// Пуска се в GitHub Actions всяка седмица. Пише data/ministries.json.
import { writeFileSync, readFileSync, existsSync } from "node:fs";
const B = "https://iisda.government.bg";
const UA = { "user-agent": "Mozilla/5.0 (osaznatost.bg; отворени данни)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function req(url, init = {}, tries = 3) {
  for (let a = 0; a < tries; a++) {
    try { const r = await fetch(url, { ...init, headers: { ...UA, ...(init.headers ?? {}) } }); if (r.ok) return await r.text(); } catch {}
    await sleep(2000 * (a + 1));
  }
  return null;
}
const text = (h) => h.replace(/<!\[CDATA\[S?|\]\]>/g, "").replace(/<br\s*\/?>|<\/li>|<\/div>|<\/h2>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&quot;/g, "\"").replace(/&amp;/g, "&").replace(/[ \t]+/g, " ").replace(/\n\s*/g, "\n").trim();
const num = (s) => (s == null ? null : Math.round(parseFloat(s.replace(",", "."))));
const date = (s) => { const m = s?.match(/(\d{2})\.(\d{2})\.(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };

async function info(page, id) {
  await sleep(400);
  const body = new URLSearchParams({ xjxfun: "getAjaxInfo" }); body.append("xjxargs[]", "S" + id);
  const r = await req(page, { method: "POST", body, headers: { "content-type": "application/x-www-form-urlencoded" } });
  if (!r) return null;
  const t = text(r);
  const lines = t.split("\n").map((x) => x.trim()).filter(Boolean);
  const since = date(t.match(/Дата на встъпване:\s*([\d.]+)/)?.[1]);
  // След заглавието идва името на човека, ако длъжността е заета.
  const person = since ? lines[1] : null;
  return {
    title: lines[0] ?? null,
    person: person && !/^(Дата|Електронна|Численост|Функции|Правомощия)/.test(person) ? person : null,
    since,
    staff: num(t.match(/Щатна численост\s*Общо:\s*([\d.,]+)/)?.[1]),
    vacant: num(t.match(/Незаети длъжности\s*Общо:\s*([\d.,]+)/)?.[1]),
    eik: t.match(/ЕИК\/БУЛСТАТ\s*(\d{9,13})/)?.[1] ?? null,
    site: t.match(/Уеб сайт:\s*(\S+)/)?.[1] ?? null,
  };
}
async function children(page, nodeId) {
  await sleep(400);
  const r = await req(`${page}?action=getNodes&nodeId=${encodeURIComponent(nodeId)}`, { headers: { accept: "application/json" } });
  try { const j = JSON.parse(r ?? "false"); return Array.isArray(j) ? j : []; } catch { return []; }
}

const listHtml = await req(`${B}/ras/adm_structures/ministries`);
if (!listHtml) { console.error("Регистърът не отговаря"); process.exit(1); }
const ministries = [...new Map([...listHtml.matchAll(/href="\/ras\/adm_structures\/ministry_organigram\/(\d+)"[^>]*>([^<]+)</g)].map((m) => [m[1], m[2].trim()])).entries()];
const out = [];
for (const [rid, name] of ministries) {
  const page = `${B}/ras/adm_structures/ministry_organigram/${rid}`;
  const html = await req(page);
  if (!html) { console.log("Пропускам", name); continue; }
  const s = html.indexOf("init(") + 5; let d = 0, e = s;
  for (; e < html.length; e++) { if (html[e] === "{") d++; else if (html[e] === "}") { d--; if (!d) { e++; break; } } }
  let tree; try { tree = JSON.parse(html.slice(s, e)); } catch { console.log("Без органиграма:", name); continue; }
  const root = await info(page, tree.id);
  const M = { id: rid, name, url: page, eik: root?.eik ?? null, site: root?.site ?? null, leaders: [], units: [], agencies: [] };
  const visit = async (n, parent) => {
    const kind = n.id.split("-")[0];
    if (kind === "batchInfo" && n.id !== tree.id) {
      const x = await info(page, n.id);
      M.agencies.push({ id: n.id.split("-")[1], name: n.name, eik: x?.eik ?? null, site: x?.site ?? null });
      return; // агенциите имат свои страници в регистъра
    }
    if (["GBHeadAdm", "GBPosition", "position", "politicalOffice"].includes(kind)) {
      const x = await info(page, n.id);
      M.leaders.push({ role: n.name, kind, person: x?.person ?? null, since: x?.since ?? null, staff: x?.staff ?? null, vacant: x?.vacant ?? null });
    } else if (kind === "unit") {
      const x = await info(page, n.id);
      M.units.push({ name: n.name, group: parent, staff: x?.staff ?? null, vacant: x?.vacant ?? null, head: x?.person ?? null });
    }
    let kids = n.children ?? [];
    if (!kids.length && /Administration$/.test(kind)) kids = await children(page, n.id);
    const group = /Administration$/.test(kind) ? n.name : parent;
    for (const c of kids) await visit(c, group);
  };
  await visit(tree, null);
  M.staff = M.units.reduce((a, u) => a + (u.staff ?? 0), 0) + M.leaders.reduce((a, l) => a + (l.kind === "position" ? l.staff ?? 0 : 0), 0);
  M.vacant = M.units.reduce((a, u) => a + (u.vacant ?? 0), 0);
  out.push(M);
  console.log(name, "| ръководство:", M.leaders.length, "| звена:", M.units.length, "| агенции:", M.agencies.length, "| щат:", M.staff);
}
if (out.length < 10) { console.error("Твърде малко министерства, не записвам"); process.exit(1); }
const f = "data/ministries.json";
const prev = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : { history: {} };
// История на ръководството: пазим кой е бил на всяка длъжност, за да виждаме смените.
const history = prev.history ?? {};
for (const M of out) for (const l of M.leaders) if (l.person) {
  const k = `${M.id}|${l.role}`; const h = (history[k] ??= []);
  if (!h.some((x) => x.person === l.person)) h.push({ person: l.person, since: l.since, seen: new Date().toISOString().slice(0, 10) });
}
writeFileSync(f, JSON.stringify({ source: "Административен регистър (iisda.government.bg)", url: `${B}/ras/adm_structures/ministries`, updated: new Date().toISOString().slice(0, 10), ministries: out, history }, null, 1));
console.log("Министерства:", out.length);
