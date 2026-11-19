import Link from "next/link";
import { Page, Title } from "@/components/ui";
import B from "@/data/budget.json";
import { TaxVsSpend } from "./TaxVsSpend";

export const metadata = { title: "Данъци срещу разходи", description: "Ако се вдигне или свали данък, колко пари е това и на какви разходи в бюджета отговаря." };

const rev = (code: string) => B.revenue.lines.find((l) => l.code === code)?.eur ?? 0;
const exp = (code: string) => B.expenditure.lines.find((l) => l.code === code)?.eur ?? 0;

export default function Page_() {
  const taxes = [
    { id: "vat", name: "ДДС", rate: 20, eur: rev("1.4"), note: "Приходите включват и намалената ставка 9%, затова сметката е приблизителна." },
    { id: "pit", name: "Данък върху доходите на физическите лица", rate: 10, eur: rev("1.3"), note: "" },
    { id: "cit", name: "Корпоративен данък", rate: 10, eur: rev("1.1"), note: "" },
    { id: "div", name: "Данък върху дивидентите", rate: 5, eur: rev("1.2"), note: "Редът в бюджета включва и данъци върху ликвидационни дялове и доходи на чуждестранни фирми." },
  ];
  const spend = [
    ...B.ministries.filter((m) => m.planned > 0).slice(0, 15).map((m) => ({ name: m.name.charAt(0).toUpperCase() + m.name.slice(1), eur: m.planned })),
    { name: "Заплати и осигуровки в държавния бюджет (персонал)", eur: exp("1.1") },
  ].sort((a, b) => b.eur - a.eur);
  return (
    <Page>
      <Title back={{ href: "/kalkulatori", label: "Калкулатори" }} kicker="Инструмент"
        lead={<>Когато се предлага по-висок или по-нисък данък, въпросът е колко пари е това и откъде другаде може да дойдат. Изберете данък и нова ставка. Сметката е по бюджета за {B.year} г. от Министерството на финансите.</>}>
        Данъци срещу разходи
      </Title>
      <TaxVsSpend taxes={taxes} spend={spend} year={B.year} />
      <section className="mt-10 max-w-3xl text-[15px] space-y-2">
        <h2 className="text-lg font-bold">Как се смята</h2>
        <p>
          Използваме проста пропорция: ако ставката стане X, приходите се променят в същото съотношение. Това е т.нар. статична оценка.
          Реално хората и фирмите реагират: при по-висок данък част от дейността може да намалее или да се скрие, а при по-нисък да се покаже.
          Затова истинският ефект обикновено е по-малък от показания. Оценката на Министерството на финансите за конкретна мярка е в мотивите към законопроекта.
        </p>
        <p>
          Разходите са плановете на министерствата и на държавния бюджет за {B.year} г. Показваме с колко процента трябва да се намали всеки разход, за да се получи същата сума. Това не е препоръка: всеки разход има последици, които тук не оценяваме.
        </p>
        <p className="text-sm text-muted">
          Източник: <a href="https://www.minfin.bg/bg/statistics" target="_blank" rel="noreferrer">Министерство на финансите</a>, данните са обработени от „Наясно“. Вижте и <Link href="/byudzhet">бюджета по министерства</Link>.
        </p>
      </section>
    </Page>
  );
}
