// Автоматични сигнали за начина, по който е приет един закон. Не са обвинение: показват места, които си струва да се прочетат.
import type { Bill } from "@/lib/bills";
import type { Vote } from "@/lib/parliament";

export type LawSignal = { level: "high" | "mid" | "info"; title: string; text: string };

const SECOND = /второ гласуване/i;
const FIRST = /първо гласуване/i;
const NEW = /(параграф|чл\.|член)[^,]*[–-]\s*нов(и|а)?(?![а-я])/i;
const TRANS = /преходни и заключителни|заключителни разпоредби|преходни разпоредби/i;
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

export function lawSignals(votes: Vote[], bills: Bill[]): LawSignal[] {
  const out: LawSignal[] = [];
  const second = votes.filter((v) => SECOND.test(v.title));
  const newTexts = second.filter((v) => NEW.test(v.title));
  const newTrans = newTexts.filter((v) => TRANS.test(v.title) && v.outcome !== "rejected");
  if (newTrans.length) out.push({ level: "high", title: `${newTrans.length} нови текста в преходните и заключителните разпоредби`, text: "Добавени са чак на второ четене, без обществено обсъждане. В тази част често се променят други закони. Прочетете ги в доклада на комисията и стенограмата." });
  else if (newTexts.filter((v) => v.outcome !== "rejected").length >= 3) out.push({ level: "mid", title: `${newTexts.filter((v) => v.outcome !== "rejected").length} нови текста, приети на второ четене`, text: "Текстове, които ги нямаше в първоначалния законопроект. Обикновено са поправки, но могат и да променят смисъла." });

  // Срокът между четенията: по законопроектите (датите на обсъждане в залата), ако ги има; иначе по гласуванията.
  const perBill = bills.map((b) => {
    const f = b.hall.filter((h) => /първо/i.test(h.stage)).map((h) => h.date).sort()[0];
    const sec = b.hall.filter((h) => /второ/i.test(h.stage)).map((h) => h.date).sort()[0];
    return f && sec ? days(f, sec) : null;
  }).filter((x): x is number => x !== null);
  let gap: number | null = perBill.length ? Math.min(...perBill) : null;
  if (gap === null && !bills.length) {
    const firstOk = votes.filter((v) => FIRST.test(v.title) && !/процедура/i.test(v.title) && v.outcome !== "rejected").map((v) => v.date).sort();
    const sec = second.map((v) => v.date).sort()[0];
    // последното първо четене преди първото второ четене (законът може да е променян с няколко законопроекта)
    const f = sec ? firstOk.filter((d) => d <= sec).at(-1) : undefined;
    gap = f && sec ? days(f, sec) : null;
  }
  if (gap === 0) out.push({ level: "high", title: "Двете четения в един ден", text: "Законът е приет на първо и второ четене в едно заседание. Няма срок за предложения и за обсъждане в комисия между четенията. Понякога е оправдано (спешни или технически промени), но намалява контрола." });
  else if (gap !== null && gap < 7) out.push({ level: "mid", title: `Само ${gap} дни между двете четения`, text: "Обичайният срок за предложения между четенията е 7 дни. По-краткият срок означава по-малко време за депутатите и обществото да предложат промени." });

  for (const b of bills.filter((x) => !x.withdrawn)) {
    if (b.veto) out.push({ level: "high", title: "Наложено вето от президента", text: `Президентът върна закона за ново обсъждане (${b.veto}).` });
  }
  const conflict = [...new Set(bills.flatMap((b) => b.notes?.conflict ?? []))];
  if (conflict.length) out.push({ level: "high", title: "Депутати обявиха конфликт на интереси", text: `От доклада на комисията: „${conflict[0].slice(0, 300)}“` });
  const against = [...new Set(bills.flatMap((b) => b.notes?.against ?? []))];
  if (against.length) out.push({ level: "mid", title: "Институция не подкрепя поне един от законопроектите", text: `От доклада на комисията: „${against[0].slice(0, 300)}“` });
  const mp = bills.filter((b) => !b.withdrawn && !b.byGov);
  if (bills.length && mp.length === bills.filter((b) => !b.withdrawn).length && mp.length) out.push({ level: "info", title: "Внесен от депутати", text: "Законопроектите на депутати не минават през задължителното 30-дневно обществено обсъждане на strategy.bg, както тези на Министерския съвет, и често нямат подробна оценка на въздействието." });
  if (bills.length && !bills.some((b) => b.opinions.length)) out.push({ level: "info", title: "Няма публикувани становища", text: "На сайта на парламента няма становища на външни организации (браншове, синдикати, институции) по този законопроект." });
  return out;
}
