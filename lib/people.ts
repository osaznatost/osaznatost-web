// Единната страница на човек: депутатите имат профил в „Парламент“, кметовете и съветниците — в „Лица“.
// Тук свързваме име → страница, за да води всяко споменаване (санкции, дела, фирми, решения) на едно и също място.
import links from "@/data/political-links.json";
import { MPS } from "@/lib/parliament";
import { localPeople } from "@/lib/local";

const norm = (s: string) => s.toUpperCase().replace(/\s+/g, " ").trim();
const firstLast = (s: string) => { const p = norm(s).split(" "); return `${p[0]} ${p.at(-1)}`; };
const MP_BY = new Map<string, number>();
for (const m of MPS) { MP_BY.set(norm(m.name), m.id); MP_BY.set(firstLast(m.name), MP_BY.get(firstLast(m.name)) ?? m.id); }
let LOCAL: Promise<Map<string, string>> | null = null;
/** Индекс име → slug на местните длъжностни лица (строи се веднъж). */
function localBy() {
  return (LOCAL ??= localPeople().then((people) => {
    const m = new Map<string, string>();
    for (const [slug, [, name]] of Object.entries(people)) if (!m.has(norm(name))) m.set(norm(name), slug);
    return m;
  }));
}

/** Връзките към профилите (депутат или местна власт) по име; зарежда индекса веднъж, после търсенето е синхронно. */
export async function peopleLinks() {
  const L = await localBy();
  /** Страницата на човека по име (три имена или име и фамилия), ако го има в данните. */
  const personPage = (name: string): string | null => {
    const id = MP_BY.get(norm(name)) ?? MP_BY.get(firstLast(name));
    if (id) return `/parlament/deputat/${id}`;
    const slug = L.get(norm(name));
    return slug ? `/lica/${slug}` : null;
  };
  /** Профилът в местната власт на човек с тези три имена. */
  const localPage = (name: string) => { const s = L.get(norm(name)); return s ? `/lica/${s}` : null; };
  return { personPage, localPage };
}

type L = { who: string; kind: "mp" | "official"; roles?: string[]; mpId?: number; position?: string };
const BY_EIK = (links as unknown as { byEik: Record<string, L[]> }).byEik;
/** Фирмите, с които депутатът е свързан по Търговския регистър. */
export function firmsOfMp(id: number) {
  return Object.entries(BY_EIK).flatMap(([eik, ls]) => ls.filter((l) => l.kind === "mp" && l.mpId === id).map((l) => ({ eik, roles: l.roles ?? [] })));
}
