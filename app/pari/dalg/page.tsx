import Link from "next/link";
import { LineChart } from "@/components/Charts";
import { KeyNumber, Page, Title, num, SectionTitle } from "@/components/ui";
import { DEBT_GDP, DEBT_GDP_SOURCE } from "@/lib/params";

export const metadata = { title: "Държавен дълг" };

const plan = [
  { label: "Таван на нов дълг 2026", value: "10,1 млрд. €", note: "от тях 3,26 млрд. € заем по SAFE за отбрана", src: "https://www.capital.bg/politika_i_ikonomika/ikonomika/2026/07/15/4935480_bjudjet_2026_kakvo_triabva_da_znaem/" },
  { label: "План за нов дълг 2027", value: "8,6 млрд. €", note: "8,5 млрд. € за 2028, 7,9 млрд. € за 2029", src: "https://www.capital.bg/en/economy/2026/11/06/4977193_bulgarias_2027_budget_slight_spending_cuts_and_new/" },
  { label: "Дефицит 2026 (начислен)", value: "5,4% от БВП", note: "план: 3,9% през 2027 и 3,3% през 2028", src: "https://www.capital.bg/en/economy/2026/07/03/4931793_2026_budget_7_billion_problems/" },
];

export default function Dalg() {
  const last = DEBT_GDP.at(-1)!;
  const prev = DEBT_GDP.at(-2)!;
  const recent = DEBT_GDP.filter((d) => d.year >= 2005);
  return (
    <Page>
      <Title kicker="Пари на държавата" lead="Колко дължи държавата като дял от икономиката, как се е променяло и какво е планирано.">
        Държавен дълг
      </Title>

      <div className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-3 mb-12 [&>*:first-child]:col-span-2 sm:[&>*:first-child]:col-span-1">
        <KeyNumber label="Дълг, 2025" value={`${num(last.value)}%`} note="от БВП, сектор „Държавно управление“" />
        <KeyNumber label="Промяна за 2025" value={`+${num(last.value - prev.value)} пр.п.`} note={`от ${num(prev.value)}% през 2024 · най-големият ръст от 2014 г.`} />
        <KeyNumber label="Праг по правилата на ЕС" value="60%" note="България остава сред страните с най-нисък дълг в ЕС" />
      </div>

      <section className="mb-12">
        <SectionTitle>Дълг като % от БВП, 2005–2025</SectionTitle>
        <LineChart data={recent} x="year" y="value" yLabel="% от БВП" highlightFrom={2025} />
        <p className="text-xs text-muted mt-2">
          Източник: <a href={DEBT_GDP_SOURCE.url} target="_blank" rel="noreferrer">{DEBT_GDP_SOURCE.title}</a>
        </p>
        <details className="mt-4 text-[15px]">
          <summary className="cursor-pointer">Цялата серия от 1995 г. (включително 1996–1997)</summary>
          <div className="mt-3"><LineChart data={DEBT_GDP} x="year" y="value" yLabel="% от БВП" /></div>
          <p className="text-sm text-muted mt-2">През 1996 г. дългът достига 244,5% от БВП при хиперинфлацията и банковата криза. Затова тази година се вижда като връх.</p>
        </details>
      </section>

      <section className="mb-12">
        <SectionTitle>Какво е планирано</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-3 [&>*:first-child]:col-span-2 sm:[&>*:first-child]:col-span-1">
          {plan.map((p) => (
            <KeyNumber key={p.label} label={p.label} value={p.value} note={p.note} source={{ title: "Капитал", url: p.src }} />
          ))}
        </div>
        <p className="text-sm text-muted mt-4">Плановете са от проектобюджети и подлежат на промяна при гласуването. Ще ги заменим с текста на приетите закони.</p>
      </section>

      <section className="max-w-3xl">
        <SectionTitle>Как да четем тези числа</SectionTitle>
        <ul className="list-disc pl-5 space-y-2">
          <li>Дълг като % от БВП показва колко голям е дългът спрямо икономиката. Ако икономиката расте по-бързо от дълга, процентът пада дори при нов дълг.</li>
          <li>Нов дълг не означава само нови разходи. Част от него рефинансира стар дълг, който падежира.</li>
          <li>Числото не казва дали парите са похарчени добре. За това трябват данни за разходите. Работим по тях.</li>
        </ul>
        <p className="mt-4"><Link href="/proverki/dalg-2026">Проверка: два поста за дълга</Link></p>
      </section>
    </Page>
  );
}
