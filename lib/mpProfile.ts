import ds from "@/content/ds-affiliation.json";
import history from "@/data/mp-history.json";
import profiles from "@/data/mp-profiles.json";
import prefs from "@/data/preferences-2026.json";
import { CLAIMS, type Claim } from "@/lib/checks";

export type Membership = { c: string; pos: string; t: number; f: string; to: string };
export type MpProfile = {
  id: number; name: string; born: string | null; bornIn: string; cv: string; spec: string; prof: string[]; langs: string[]; list: string; mir: string;
  ms: Membership[]; bills: number; billsList: { id: number; sign: string; date: string; title: string }[]; control: number; controlList: { date: string; about: string }[]; penalties: number;
};
export type Pref = { mir: number; mirName: string; party: number; pos: number; prefs: number; listVotes: number; pct: number | null; top: { code: string; name: string; votes: number }[] };

const norm = (n: string) => n.toUpperCase().replace(/\s*-\s*/g, "-").replace(/\s+/g, " ").trim();
const P = (profiles as unknown as { byId: Record<string, MpProfile> }).byId;
const byName = new Map(Object.values(P).map((p) => [norm(p.name), p]));
const H = (history as unknown as { byName: Record<string, { ns: string[]; born: string | null; electedWith: string | null; group: string | null }> }).byName;
const DS = ds as unknown as { check: { date: string; what: string; sources: { title: string; url: string }[] }; byName: Record<string, { role: string; decision: string; match: string; context: string; sources: { title: string; url: string }[] }> };

export const profileFor = (name: string) => byName.get(norm(name));
export const historyFor = (name: string) => H[norm(name)];
export const prefsFor = (id: number) => ((prefs as unknown as { byMp: Record<string, Pref[]> }).byMp[String(id)] ?? []);
export const DS_CHECK = DS.check;
export function dsFor(name: string, born?: string | null) {
  const hit = DS.byName[norm(name)];
  if (hit) return { status: "declared" as const, ...hit };
  if (born && Number(born.slice(0, 4)) > 1973) return { status: "exempt" as const };
  return { status: "none" as const };
}
/** Проверени твърдения на депутата: пълно име или „И. Фамилия“. */
export function claimsFor(name: string): Claim[] {
  const parts = name.trim().split(/\s+/);
  const first = parts[0], last = parts.at(-1)!;
  return CLAIMS.filter((c) => {
    const w = c.who.trim();
    return w === `${first} ${last}` || w === name || w === `${first[0]}. ${last}`;
  });
}

export const NS_YEARS: Record<string, string> = {
  "36": "1991–1994", "37": "1995–1997", "38": "1997–2001", "39": "2001–2005", "40": "2005–2009", "41": "2009–2013", "42": "2013–2014",
  "43": "2014–2017", "44": "2017–2021", "45": "2021", "46": "2021", "47": "2021–2022", "48": "2022–2023", "49": "2023–2024", "50": "2024", "51": "2024–2026", "52": "2026–",
};
export const MS_TYPE: Record<number, string> = { 1: "Народно събрание", 2: "Парламентарна група", 3: "Постоянна комисия", 4: "Временна комисия", 6: "Делегация", 9: "Подкомисия", 11: "Група за приятелство" };
