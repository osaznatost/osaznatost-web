// Импорт на поименните гласувания за текущото Народно събрание.
// Източник на обработените данни: проектът „Наясно“ (github.com/atanasster/electionsbg, MIT),
// който ги извлича от стенограмите на parliament.bg. Ние ги свиваме до един файл.
import { writeFile, mkdir } from "node:fs/promises";
import { fixOutcome } from "./majority.mjs";

const NS = process.env.NS ?? "52";
const RAW = "https://raw.githubusercontent.com/atanasster/electionsbg/main/data/parliament/votes";

async function get(path) {
  const r = await fetch(`${RAW}/${path}`);
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.json();
}

const topic = (await get("derived/topic_index.json")).byNs[NS].entries;
const attendance = (await get("derived/attendance.json")).byNs[NS];
const dates = [...new Set(topic.map((t) => t.date))].sort();

const mpNames = {};
const mpParty = {};
const sessions = {};
const pdf = {};
for (const d of dates) {
  const s = await get(`sessions/${d}.json`);
  Object.assign(mpNames, s.mpNames);
  Object.assign(mpParty, s.mpParty); // последната известна група печели
  sessions[d] = s.sessions;
  pdf[d] = s.pdfUrl;
}

const mpIds = Object.keys(mpNames).map(Number).sort((a, b) => a - b);
const idx = new Map(mpIds.map((id, i) => [id, i]));
const code = { yes: "y", no: "n", abstain: "a", absent: "x" };

const votes = [];
for (const t of topic) {
  const sess = sessions[t.date]?.find((s) => s.item === t.item);
  if (!sess) continue;
  const arr = new Array(mpIds.length).fill("-");
  for (const v of sess.votes) {
    const i = idx.get(v.mpId);
    if (i !== undefined) arr[i] = code[v.vote] ?? "-";
  }
  votes.push({
    id: `${t.date}-${t.item}`,
    date: t.date,
    item: t.item,
    title: t.title || `Гласуване без заглавие в източника (точка ${t.item})`,
    topic: t.topic,
    outcome: sess.tallies ? fixOutcome(t.title ?? "", sess.tallies, t.outcome) : t.outcome,
    tally: sess.tallies,
    contest: t.contestScore ?? null,
    v: arr.join(""),
    pdf: pdf[t.date] ?? null,
  });
}
votes.sort((a, b) => (a.date === b.date ? b.item - a.item : a.date < b.date ? 1 : -1));

const att = new Map(attendance.entries.map((e) => [e.mpId, e]));
const mps = mpIds.map((id) => ({
  id,
  name: mpNames[id].toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (m, p, c) => p + c.toUpperCase()),
  party: mpParty[id] ?? "",
  presentPct: att.get(id)?.presentPct ?? null,
}));

await mkdir("data", { recursive: true });
await writeFile(
  `data/parliament-ns${NS}.json`,
  JSON.stringify({
    ns: NS,
    updatedAt: new Date().toISOString(),
    source: {
      title: "Поименни гласувания: стенограми на Народното събрание, обработени от проекта „Наясно“ (naiasno.bg, лиценз MIT)",
      url: "https://naiasno.bg/parliament",
      repo: "https://github.com/atanasster/electionsbg",
    },
    mps,
    votes,
  }),
);
console.log(`NS ${NS}: ${mps.length} депутати, ${votes.length} гласувания, ${dates[0]} – ${dates.at(-1)}`);
