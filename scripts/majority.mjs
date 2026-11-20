// Особени мнозинства при гласуванията в Народното събрание.
/** Колко гласа „за“ трябват. Обикновено: повече от половината гласували.
 *  Особено мнозинство, което разпознаваме сигурно по заглавието: членове на ВСС от квотата на парламента — 2/3 от всички 240, тоест 160 (Конституция и ЗСВ).
 *  Други особени мнозинства (вето, Конституция) не се познават надеждно по заглавието и затова не ги прилагаме автоматично. */
export function needed(title, voting) {
  const t = title.toLowerCase();
  if (/висшия съдебен съвет/.test(t) && /избор|избира/.test(t) && !/процедур/.test(t)) return 160;
  return Math.floor(voting / 2) + 1;
}
/** Изходът при особено мнозинство; за обикновените оставя изхода от източника. */
export function fixOutcome(title, tally, outcome) {
  const voting = tally.yes + tally.no + tally.abstain;
  const need = needed(title, voting);
  if (need === Math.floor(voting / 2) + 1) return outcome;
  return tally.yes >= need ? (tally.no === 0 && tally.abstain === 0 ? "passed_unanimous" : "passed") : "rejected";
}
