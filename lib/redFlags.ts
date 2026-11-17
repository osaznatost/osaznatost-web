import type { Annex, Contract } from "@/lib/procurement";
import { THRESHOLDS } from "@/lib/buyerAnalysis";
import { politicalLinks } from "@/lib/procurement";

const OWN = new Set(["съдружник", "едноличен собственик", "дял в капитала", "действителен собственик", "посочено в декларация"]);
/** Личен интерес на политик: депутат с каквато и да е роля или длъжностно лице със собственост (не управител на държавна фирма). */
export const personalLink = (eik: string) => politicalLinks(eik).some((l) => l.kind === "mp" || (l.roles ?? []).some((r) => OWN.has(r)));

/** Червени флагове по образеца на Европейската служба за борба с измамите (OLAF) и инструмента на ЕК за ранно предупреждение.
 *  Всеки флаг е повод за въпрос, не доказателство. Индексът е сума от теглата, най-много 100. */
export type Flag = { id: string; label: string; why: string; weight: number };

const NO_COMPETITION = /договаряне без|пряко договаряне|без предварително обявление|без публикуване/i;

export function contractFlags(c: Contract, annexes: Annex[] = [], political = false): Flag[] {
  const f: Flag[] = [];
  const v = c.contract_value_eur ?? 0, est = c.estimated_value_eur ?? 0;
  if (c.offers_count === 1) f.push({ id: "single", label: "Само една оферта", why: "Няма с кого да се сравни цената.", weight: 25 });
  if (c.procedure_type && NO_COMPETITION.test(c.procedure_type)) f.push({ id: "direct", label: "Без открит конкурс", why: `Процедура: ${c.procedure_type.toLowerCase()}.`, weight: 20 });
  if (est > 0 && v > est * 1.05) f.push({ id: "over", label: "Над прогнозната стойност", why: `Договорът е с ${Math.round((v / est - 1) * 100)}% над очакваното от възложителя.`, weight: 10 });
  if (est > 0 && c.offers_count === 1 && v >= est * 0.97 && v <= est * 1.0001) f.push({ id: "exact", label: "Цена почти равна на прогнозата", why: "Единственият участник предлага почти точно колкото възложителят е очаквал.", weight: 10 });
  const added = annexes.reduce((s, a) => s + Math.max(0, a.value_difference_eur ?? 0), 0);
  if (v > 0 && added / v > 0.1) f.push({ id: "annex", label: "Оскъпяване с анекси", why: `Анексите добавят ${Math.round((added / v) * 100)}% към цената.`, weight: added / v > 0.3 ? 20 : 12 });
  if ((c.disqualified_offers_count ?? 0) > 0 && (c.offers_count ?? 0) - (c.disqualified_offers_count ?? 0) <= 1) f.push({ id: "disq", label: "Отстранени конкуренти", why: `Отстранени ${c.disqualified_offers_count} оферти и остава един кандидат.`, weight: 15 });
  const works = /строител|works/i.test(c.contract_type ?? "");
  const th = works ? THRESHOLDS.works : THRESHOLDS.other;
  if (v > th * 0.9 && v < th) f.push({ id: "threshold", label: "Точно под прага", why: "Стойността е малко под прага, над който е нужна по-строга процедура.", weight: 10 });
  if (political) f.push({ id: "political", label: "Връзка с политик", why: "Изпълнителят е свързан с депутат или е собственост на длъжностно лице (по Търговския регистър и декларациите).", weight: 20 });
  if (c.has_subcontractors && Number(String(c.subcontracting_percent ?? "").replace(",", ".")) >= 50) f.push({ id: "sub", label: "Голям дял на подизпълнители", why: `Подизпълнителите поемат ${c.subcontracting_percent}% от работата.`, weight: 8 });
  return f;
}
export const riskScore = (flags: Flag[]) => Math.min(100, flags.reduce((s, x) => s + x.weight, 0));
export const riskLabel = (s: number) => (s >= 45 ? { t: "висок", cls: "bg-red text-white" } : s >= 20 ? { t: "среден", cls: "bg-[#e08a2e] text-white" } : s > 0 ? { t: "нисък", cls: "bg-surface" } : { t: "няма флагове", cls: "bg-surface text-muted" });
