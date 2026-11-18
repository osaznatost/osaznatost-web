// Единната страница на човек: депутатите имат профил в „Парламент“, кметовете и съветниците — в „Лица“.
// Тук свързваме име → страница, за да води всяко споменаване (санкции, дела, фирми, решения) на едно и също място.
import links from "@/data/political-links.json";
import { MPS } from "@/lib/parliament";
import { PEOPLE } from "@/lib/local";

const norm = (s: string) => s.toUpperCase().replace(/\s+/g, " ").trim();
const firstLast = (s: string) => { const p = norm(s).split(" "); return `${p[0]} ${p.at(-1)}`; };
const MP_BY = new Map<string, number>();
for (const m of MPS) { MP_BY.set(norm(m.name), m.id); MP_BY.set(firstLast(m.name), MP_BY.get(firstLast(m.name)) ?? m.id); }
const LOCAL_BY = new Map<string, string>();
for (const [slug, [, name]] of Object.entries(PEOPLE)) if (!LOCAL_BY.has(norm(name))) LOCAL_BY.set(norm(name), slug);

/** Страницата на човека по име (три имена или име и фамилия), ако го има в данните. */
export function personPage(name: string): string | null {
  const id = MP_BY.get(norm(name)) ?? (norm(name).split(" ").length === 2 ? MP_BY.get(norm(name)) : undefined) ?? MP_BY.get(firstLast(name));
  if (id) return `/parlament/deputat/${id}`;
  const slug = LOCAL_BY.get(norm(name));
  return slug ? `/lica/${slug}` : null;
}
/** Профилът в местната власт на човек с тези три имена. */
export const localPage = (name: string) => { const s = LOCAL_BY.get(norm(name)); return s ? `/lica/${s}` : null; };

type L = { who: string; kind: "mp" | "official"; roles?: string[]; mpId?: number; position?: string };
const BY_EIK = (links as unknown as { byEik: Record<string, L[]> }).byEik;
/** Фирмите, с които депутатът е свързан по Търговския регистър. */
export function firmsOfMp(id: number) {
  return Object.entries(BY_EIK).flatMap(([eik, ls]) => ls.filter((l) => l.kind === "mp" && l.mpId === id).map((l) => ({ eik, roles: l.roles ?? [] })));
}
