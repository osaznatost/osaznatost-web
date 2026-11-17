import raw from "@/data/parliament-ns52.json";

export type VoteCode = "y" | "n" | "a" | "x" | "-";
export type Mp = { id: number; name: string; party: string; presentPct: number | null };
export type Vote = {
  id: string; date: string; item: number; title: string; topic: string; outcome: string;
  tally: { yes: number; no: number; abstain: number; absent: number };
  contest: number | null; v: string; pdf: string | null;
};

const data = raw as unknown as { ns: string; updatedAt: string; source: { title: string; url: string; repo: string }; mps: Mp[]; votes: Vote[] };

export const NS = data.ns;
export const UPDATED_AT = data.updatedAt;
export const PARLIAMENT_SOURCE = data.source;
export const MPS = data.mps;
export const VOTES = data.votes;

export const PARTY_NAMES: Record<string, string> = {
  "ПБ": "Прогресивна България",
  "ГЕРБ - СДС": "ГЕРБ – СДС",
  "ДБ": "Демократична България",
  "ПП": "Продължаваме промяната",
  "ДПС": "ДПС",
  "ВЪЗРАЖДАНЕ": "Възраждане",
};
export const partyName = (p: string) => PARTY_NAMES[p] ?? p;

export const TOPICS: Record<string, string> = {
  zid: "Промени в закони",
  budget: "Бюджет и финанси",
  tax: "Данъци",
  personnel: "Избори и назначения",
  ratification: "Ратификации",
  other: "Процедури и други",
};

export const OUTCOMES: Record<string, string> = {
  passed: "Прието",
  passed_unanimous: "Прието единодушно",
  rejected: "Отхвърлено",
};

export const VOTE_LABEL: Record<VoteCode, string> = { y: "За", n: "Против", a: "Въздържал се", x: "Отсъства", "-": "Не е депутат тогава" };

const mpIndex = new Map(MPS.map((m, i) => [m.id, i]));

/** Партиите, подредени по брой депутати (последна известна група). */
export const PARTIES = Object.entries(
  MPS.reduce<Record<string, number>>((acc, m) => ((acc[m.party] = (acc[m.party] ?? 0) + 1), acc), {}),
).sort((a, b) => b[1] - a[1]).map(([p]) => p);

export type PartyCount = { y: number; n: number; a: number; x: number };

const breakdownCache = new Map<string, Record<string, PartyCount>>();
export function partyBreakdown(vote: Vote): Record<string, PartyCount> {
  const hit = breakdownCache.get(vote.id);
  if (hit) return hit;
  const out: Record<string, PartyCount> = {};
  MPS.forEach((m, i) => {
    const c = vote.v[i] as VoteCode;
    if (c === "-") return;
    const b = (out[m.party] ??= { y: 0, n: 0, a: 0, x: 0 });
    b[c]++;
  });
  breakdownCache.set(vote.id, out);
  return out;
}

/** Как е гласувало мнозинството от присъстващите в групата: y, n, a или "split" при равенство. */
export function partyPosition(c: PartyCount): "y" | "n" | "a" | "split" | "absent" {
  const present = c.y + c.n + c.a;
  if (present === 0) return "absent";
  const max = Math.max(c.y, c.n, c.a);
  const winners = (["y", "n", "a"] as const).filter((k) => c[k] === max);
  return winners.length > 1 ? "split" : winners[0];
}

export const getVote = (id: string) => VOTES.find((v) => v.id === id);
export const getMp = (id: number) => MPS.find((m) => m.id === id);

export function mpVote(vote: Vote, mpId: number): VoteCode {
  const i = mpIndex.get(mpId);
  return i === undefined ? "-" : (vote.v[i] as VoteCode);
}

/** Статистика за депутат: присъствие и гласувания срещу мнозинството в собствената група. */
export function mpStats(mpId: number) {
  const i = mpIndex.get(mpId)!;
  const mp = MPS[i];
  let eligible = 0, present = 0, against = 0;
  const dissents: { vote: Vote; own: VoteCode; party: string }[] = [];
  for (const v of VOTES) {
    const c = v.v[i] as VoteCode;
    if (c === "-") continue;
    eligible++;
    if (c === "x") continue;
    present++;
    const pos = partyPosition(partyBreakdown(v)[mp.party]);
    if ((pos === "y" || pos === "n" || pos === "a") && c !== pos) {
      against++;
      dissents.push({ vote: v, own: c, party: pos });
    }
  }
  return { eligible, present, against, dissents };
}

/** Статистика за партия: присъствие, единство, колко често е от страната на резултата. */
export function partyStats(party: string) {
  const members = MPS.map((m, i) => ({ m, i })).filter(({ m }) => m.party === party);
  let cast = 0, possible = 0, unitySum = 0, unityN = 0, onWinning = 0, decided = 0, votedYes = 0, votedNo = 0;
  for (const v of VOTES) {
    const c: PartyCount = { y: 0, n: 0, a: 0, x: 0 };
    for (const { i } of members) {
      const code = v.v[i] as VoteCode;
      if (code === "-") continue;
      c[code]++;
    }
    const present = c.y + c.n + c.a;
    possible += present + c.x;
    cast += present;
    if (present > 0) {
      unitySum += Math.max(c.y, c.n, c.a) / present;
      unityN++;
      const pos = partyPosition(c);
      if (pos === "y") votedYes++;
      if (pos === "n") votedNo++;
      const passed = v.outcome !== "rejected";
      if (pos === "y" || pos === "n") {
        decided++;
        if ((pos === "y") === passed) onWinning++;
      }
    }
  }
  return {
    seats: members.length,
    attendance: possible ? cast / possible : 0,
    unity: unityN ? unitySum / unityN : 0,
    winningShare: decided ? onWinning / decided : 0,
    votedYes, votedNo,
  };
}

/** Колко често две партии са гласували еднакво (по позиция на мнозинството). */
export function agreement(a: string, b: string) {
  let same = 0, both = 0;
  for (const v of VOTES) {
    const br = partyBreakdown(v);
    if (!br[a] || !br[b]) continue;
    const pa = partyPosition(br[a]);
    const pb = partyPosition(br[b]);
    if (!["y", "n", "a"].includes(pa) || !["y", "n", "a"].includes(pb)) continue;
    both++;
    if (pa === pb) same++;
  }
  return both ? same / both : 0;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("bg-BG", { day: "numeric", month: "long", year: "numeric" });
}
