import raw from "@/content/checks.json";
import { LAWS } from "@/lib/laws";

export type Verdict = "Вярно" | "Отчасти вярно" | "Подвеждащо" | "Невярно" | "Непотвърдено" | "Мнение";
export type Claim = {
  id: string; date: string; who: string; party?: string; topic: string;
  claim: string; verdict: Verdict; why: string; sources: { title: string; url: string }[];
  dossier?: string; law?: { slug: string; name: string };
};
export type Dossier = { slug: string; title: string; date: string; topic: string; lead: string; summary: string[]; stat?: string };

const data = raw as { dossiers: Dossier[]; claims: Claim[] };

export const VERDICTS: { v: Verdict; about: string; cls: string }[] = [
  { v: "Вярно", about: "Съвпада с официалните данни.", cls: "bg-[#d7ecd9] text-[#1f5c2a]" },
  { v: "Отчасти вярно", about: "Вярно в основата, но с важна неточност или пропуснат контекст.", cls: "bg-[#eef3d2] text-[#4d5a12]" },
  { v: "Подвеждащо", about: "Числото може да е вярно, но изводът, който внушава, не следва от данните.", cls: "bg-[#fbecc4] text-[#6b4a00]" },
  { v: "Невярно", about: "Противоречи на официалните данни или документи.", cls: "bg-[#f6d5d8] text-[#8a1c27]" },
  { v: "Непотвърдено", about: "Още проверяваме или няма публикуван документ, който да го потвърди или опровергае.", cls: "bg-surface text-muted" },
  { v: "Мнение", about: "Оценка или сравнение, не факт. Не го проверяваме, но показваме контекста.", cls: "bg-white text-muted border border-dashed border-muted" },
];
export const verdictCls = (v: string) => VERDICTS.find((x) => x.v === v)?.cls ?? "bg-surface text-muted";

const PARTY: Record<string, string> = { "Т. Петкова": "ГЕРБ–СДС", "Теменужка Петкова": "ГЕРБ–СДС", "А. Василев": "ПП", "Асен Василев": "ПП" };

/** Проверките от анализите на законите, превърнати в същия формат. */
function lawClaims(): Claim[] {
  const out: Claim[] = [];
  for (const [slug, law] of Object.entries(LAWS)) {
    (law.checks ?? []).forEach((c, i) => {
      const m = c.claim.match(/\(([^)]+)\)\s*$/);
      const who = m?.[1] ?? "Публично твърдение";
      out.push({
        id: `zakon-${slug}-${i}`, date: law.reviewed, who, party: PARTY[who], topic: "Закони",
        claim: c.claim.replace(/\s*\([^)]+\)\s*$/, ""), verdict: c.verdict as Verdict, why: c.why,
        sources: [], law: { slug, name: law.name },
      });
    });
  }
  return out;
}

export const CLAIMS: Claim[] = [...data.claims, ...lawClaims()].sort((a, b) => (a.date < b.date ? 1 : -1));
export const DOSSIERS = data.dossiers;
export const dossier = (slug: string) => DOSSIERS.find((d) => d.slug === slug);
