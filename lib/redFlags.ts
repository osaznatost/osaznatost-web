import type { Annex, Contract } from "@/lib/procurement";
import { THRESHOLDS } from "@/lib/buyerAnalysis";
import { politicalLinks } from "@/lib/procurement";
import { foundedDate, trFor } from "@/lib/tr";
import { legalException } from "@/lib/legalException.mjs";

import { politicalStrength } from "@/lib/politicalFlag.mjs";
import { signalFlags, tenderSignal } from "@/lib/tenderSignals.mjs";
/** Сила на личния интерес на политик във фирмата: 2 силна, 1 възможна (само по имена), 0 няма (вкл. държавни и общински дружества). */
export const personalLink = (eik: string): number => politicalStrength(politicalLinks(eik));
export const strongestLink = (eiks: string[]) => Math.max(0, ...eiks.map(personalLink));

/** Червени флагове по образеца на Европейската служба за борба с измамите (OLAF) и инструмента на ЕК за ранно предупреждение.
 *  Всеки флаг е повод за въпрос, не доказателство. Индексът е сума от теглата, най-много 100. */
export type Flag = { id: string; label: string; why: string; weight: number };

const NO_COMPETITION = /договаряне без|пряко договаряне|без предварително обявление|без публикуване/i;

export function contractFlags(c: Contract, annexes: Annex[] = [], political: number | boolean = 0): Flag[] {
  const f: Flag[] = [];
  const v = c.contract_value_eur ?? 0, est = c.estimated_value_eur ?? 0;
  const ex = legalException(c.tender_name);
  if (c.offers_count === 1) f.push({ id: "single", label: "Само една оферта", why: "Няма с кого да се сравни цената.", weight: ex ? 5 : 25 });
  if (c.procedure_type && NO_COMPETITION.test(c.procedure_type)) f.push({ id: "direct", label: "Без открит конкурс", why: `Процедура: ${c.procedure_type.toLowerCase()}.`, weight: ex ? 5 : 20 });
  if (ex && f.length) f.push({ id: "legal", label: "Законово обяснение", why: `${ex.why} Затова горните флагове тежат по-малко.`, weight: 0 });
  if (est > 0 && v > est * 1.05) f.push({ id: "over", label: "Над прогнозната стойност", why: `Договорът е с ${Math.round((v / est - 1) * 100)}% над очакваното от възложителя.`, weight: 10 });
  // При договаряне без обявление прогнозата често се определя след преговорите, затова там флагът не носи информация.
  if (est > 0 && c.offers_count === 1 && v >= est * 0.97 && v <= est * 1.0001 && !(c.procedure_type && NO_COMPETITION.test(c.procedure_type))) f.push({ id: "exact", label: "Цена почти равна на прогнозата", why: "Единственият участник предлага почти точно колкото възложителят е очаквал.", weight: 10 });
  const added = annexes.reduce((s, a) => s + Math.max(0, a.value_difference_eur ?? 0), 0);
  if (v > 0 && added / v > 0.1) f.push({ id: "annex", label: "Оскъпяване с анекси", why: `Анексите добавят ${Math.round((added / v) * 100)}% към цената.`, weight: added / v > 0.3 ? 20 : 12 });
  if ((c.disqualified_offers_count ?? 0) > 0 && (c.offers_count ?? 0) - (c.disqualified_offers_count ?? 0) <= 1) f.push({ id: "disq", label: "Отстранени конкуренти", why: `Отстранени ${c.disqualified_offers_count} оферти и остава един кандидат.`, weight: 15 });
  const works = /строител|works/i.test(c.contract_type ?? "");
  const th = works ? THRESHOLDS.works : THRESHOLDS.other;
  if (v > th * 0.9 && v < th) f.push({ id: "threshold", label: "Точно под прага", why: "Стойността е малко под прага, над който е нужна по-строга процедура.", weight: 10 });
  const pol = political === true ? 2 : Number(political) || 0;
  if (pol === 2) f.push({ id: "political", label: "Връзка с политик", why: "Изпълнителят е свързан с депутат или фирмата е посочена в декларацията на длъжностно лице.", weight: 20 });
  if (pol === 1) f.push({ id: "political_name", label: "Възможна връзка с длъжностно лице", why: "В Търговския регистър собственик на фирмата е човек със същите три имена като длъжностно лице. Може да е съименник: проверете.", weight: 8 });
  if (c.has_subcontractors && Number(String(c.subcontracting_percent ?? "").replace(",", ".")) >= 50) f.push({ id: "sub", label: "Голям дял на подизпълнители", why: `Подизпълнителите поемат ${c.subcontracting_percent}% от работата.`, weight: 8 });
  const young = c.contract_date ? c.supplier_eiks.map((e) => ({ e, d: foundedDate(trFor(e)) })).find(({ d }) => d && Date.parse(c.contract_date!) >= Date.parse(d) && Date.parse(c.contract_date!) - Date.parse(d) < 365 * 864e5) : undefined;
  if (young) f.push({ id: "new", label: "Нова фирма", why: `Изпълнителят е създаден по-малко от година преди договора (${young.d!.endsWith("-01-01") ? `${young.d!.slice(0, 4)} г.` : young.d!.split("-").reverse().join(".")}, по Търговския регистър).`, weight: 15 });
  const LABEL: Record<string, string> = { short: "Кратък срок за оферти", changes: "Чести промени в условията" };
  for (const [id, w, why] of signalFlags(tenderSignal(c.tender_id)) as [string, number, string][]) f.push({ id, label: LABEL[id], why, weight: w });
  return f;
}
export const riskScore = (flags: Flag[]) => Math.min(100, flags.reduce((s, x) => s + x.weight, 0));
export const riskLabel = (s: number) => (s >= 45 ? { t: "висок", cls: "bg-red text-white" } : s >= 20 ? { t: "среден", cls: "bg-[#e08a2e] text-white" } : s > 0 ? { t: "нисък", cls: "bg-surface" } : { t: "няма флагове", cls: "bg-surface text-muted" });
