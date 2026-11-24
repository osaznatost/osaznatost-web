"use client";
import { useState } from "react";

type Declared = { name: string; role: string; place: string; year: number | null; url: string | null; income: number | null; realEstate: number | null; vehicles: number | null; bankEur: number | null; stakes: number };

const eur = (v: number | null) => (v == null ? "–" : `${Math.round(v).toLocaleString("bg-BG")} €`);

/** Шаблон за сигнал: „в декларацията е посочено X, а публично известно е Y“. Не се изпраща от сайта: гражданинът го копира и подава сам. */
export function SignalForm({ d }: { d: Declared }) {
  const [facts, setFacts] = useState("");
  const [sources, setSources] = useState("");
  const [me, setMe] = useState("");
  const [copied, setCopied] = useState(false);
  const declared = d.year
    ? `В декларацията за ${d.year} г. (${d.url ?? "регистъра на декларациите"}) лицето е посочило: облагаем доход ${eur(d.income)}; недвижими имоти: ${d.realEstate ?? "–"}; превозни средства: ${d.vehicles ?? "–"}; парични средства в банки: ${eur(d.bankEur)}; дялове или участие във фирми: ${d.stakes ? d.stakes : "няма посочени"}.`
    : "Не открих публикувана декларация за имущество и интереси на лицето.";
  const text = `СИГНАЛ
за проверка на несъответствие в декларираното имущество и за конфликт на интереси

Относно: ${d.name}, ${d.role}${d.place ? `, ${d.place}` : ""}

1. Декларирано
${declared}

2. Публично известни факти, които според мен не съответстват на декларираното
${facts || "[опишете конкретно: какво, кога, къде; без предположения]"}

3. Източници и доказателства
${sources || "[посочете документи, връзки към регистри, решения, публикации]"}

4. Искане
Моля да бъде извършена проверка дали имуществото и интересите на лицето са декларирани пълно и вярно, включително дали имущество е придобито или прехвърлено чрез свързани лица, и дали е налице конфликт на интереси при решенията и договорите, посочени по-горе.

Подател: ${me || "[три имена, ЕГН, адрес за кореспонденция, имейл]"}
Дата: ${new Date().toLocaleDateString("bg-BG")}
Подпис:`;

  const copy = async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { setCopied(false); } };
  const field = "w-full px-3 py-2 ring-1 ring-rule rounded-sm bg-white text-[15px]";
  return (
    <div className="space-y-3 text-[15px] max-w-3xl">
      <label className="block"><span className="text-sm font-semibold">Какво е публично известно, което не се вижда в декларацията?</span>
        <textarea rows={4} value={facts} onChange={(e) => setFacts(e.target.value)} className={field} placeholder="Напр.: от 2026 г. на ул. … се строи хотел; в Търговския регистър фирма … е регистрирана на …" /></label>
      <label className="block"><span className="text-sm font-semibold">Източници (връзки, документи)</span>
        <textarea rows={2} value={sources} onChange={(e) => setSources(e.target.value)} className={field} placeholder="Връзки към регистри, решения, разрешения, публикации" /></label>
      <label className="block"><span className="text-sm font-semibold">Подател</span>
        <input value={me} onChange={(e) => setMe(e.target.value)} className={field} placeholder="Три имена, ЕГН, адрес, имейл (анонимни сигнали не се разглеждат)" /></label>
      <details><summary className="cursor-pointer text-sm">Виж целия текст</summary><pre className="whitespace-pre-wrap text-sm bg-surface rounded-sm p-3 mt-2">{text}</pre></details>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copy} className="px-4 py-2 rounded-sm bg-ink text-white">{copied ? "Копирано" : "Копирай сигнала"}</button>
        <a href={`mailto:acc@accbg.bg?subject=${encodeURIComponent(`Сигнал: ${d.name}, ${d.role}`)}&body=${encodeURIComponent(text)}`} className="px-4 py-2 rounded-sm ring-1 ring-rule bg-white no-underline">Изпрати до КПК (acc@accbg.bg)</a>
      </div>
      <p className="text-sm text-muted">Получател: Комисията за противодействие на корупцията (КПК), София 1000, пл. „Света Неделя“ № 6, <a href="https://accbg.bg/" target="_blank" rel="noreferrer">accbg.bg</a>. От 2 ноември 2026 г. КПК проверява декларациите за имущество и интереси и конфликта на интереси на лицата на публични длъжности. Сигналът съдържа трите имена, ЕГН и данни за връзка на подателя, дата и подпис; по имейл е най-сигурно с електронен подпис, иначе по пощата или в деловодството. Сайтът не изпраща и не пази сигнала. Пишете само факти, които можете да посочите с източник: неверни твърдения за конкретен човек могат да имат правни последици.</p>
    </div>
  );
}
