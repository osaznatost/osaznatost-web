import Link from "next/link";
import { Label, Page, Title } from "@/components/ui";
import corrections from "@/content/corrections.json";
import PROMISES from "@/content/promises.json";
import CASES from "@/content/cases.json";
import CHECKS from "@/content/checks.json";

export const metadata = { title: "Как работим", description: "Кой стои зад „Осъзнатост“, откъде са данните, кое се обновява само и кое пишат хора, как поправяме грешки." };

const H = ({ id, children }: { id: string; children: React.ReactNode }) => (
  <h2 id={id} className="text-xl font-bold pt-2 scroll-mt-32 lg:scroll-mt-20">{children}</h2>
);
const fmt = (d: string) => d.split("-").reverse().join(".");

export default function Metodologiya() {
  const list = [...corrections.corrections].sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <Page narrow>
      <Title>Как работим</Title>
      <div className="space-y-5 text-[17px]">
        <p>
          Не подкрепяме партия, кандидат или правителство. Всяко число на сайта има източник и дата, а всяко твърдение има автор.
          Прилагаме една и съща методология за всички, независимо кой управлява.
        </p>
        <nav className="bg-surface rounded-sm p-4 text-[15px]">
          <a href="#koy">Кой стои зад проекта</a> · <a href="#avtomatichno">Кое е автоматично и кое пишат хора</a> · <a href="#fakt">Факт, твърдение, оценка</a> · <a href="#zakon">Как разказваме закон</a> · <a href="#signal">Сигнал не е обвинение</a> · <a href="#ednakvo">Еднакъв подход към всички</a> · <a href="#iztochnici">Източници</a> · <a href="#greshki">Грешки и поправки</a>
        </nav>

        <H id="koy">Кой стои зад проекта</H>
        <p>
          „Осъзнатост“ е независим, некомерсиален граждански проект. Не получава пари от партии, институции или фирми и не продава реклама.
          Работи на безплатни услуги (GitHub, Vercel, Supabase), без платен изкуствен интелект. Програмният код е публичен в{" "}
          <a href="https://github.com/osaznatost/osaznatost-web" target="_blank" rel="noreferrer">GitHub</a>, така че всеки може да провери как се смята всяко число.
        </p>

        <H id="avtomatichno">Кое е автоматично и кое пишат хора</H>
        <ul className="list-disc pl-5 space-y-2">
          <li><b>Автоматично, по правила:</b> гласуванията в парламента, законопроектите и докладите, обществените поръчки и анексите, плащанията от СЕБРА, Търговският регистър, местната власт и декларациите, решенията на общинските съвети, цените в магазините, статистиките. Също и сигналите (съкратен срок, нови текстове на второ четене, червени флагове в поръчките), цитатите от документите на парламента и сверката на числата от трибуната. Правилата са едни и същи за всички и са описани до всеки сигнал. <Link href="/sastoyanie">Кога е обновен всеки източник</Link>.</li>
          <li><b>Пишат хора (редакционно):</b> обобщенията „двете страни“ на законите, обещанията и оценката им, проверките на твърдения, съдебните случаи и санкциите. Всяко изречение там има номер на източник. Ако не можем да го подкрепим с документ, не го пишем.</li>
        </ul>

        <H id="fakt">Факт, твърдение, оценка</H>
        <ul className="space-y-3">
          <li><Label kind="fact" /> Потвърдено от официален документ: стенограма, гласуване, Държавен вестник, съдебен акт, отчет на институция.</li>
          <li><Label kind="claim" /> Казано публично от конкретен човек. Показваме кой, кога и къде, докато не го проверим.</li>
          <li><Label kind="opinion" /> Мнение или тълкуване. Никога не го представяме като факт.</li>
        </ul>

        <H id="zakon">Как разказваме един закон</H>
        <p>За всеки гласуван закон показваме едно и също, в този ред: какво променя; мотивите на вносителите; какво казват критиците; какво показват данните; какво печели и какво губи всяка засегната група; какво следва, ако бъде приет или отхвърлен. Всеки аргумент има номер на източник, който води до първоизточника. Таблицата „печели и губи“ е наш анализ на текста и на цитираните данни, а не позиция на партия. Под нея са дословните цитати от документите, без редакция.</p>

        <H id="signal">Сигнал не е обвинение</H>
        <p>Сигнал не е обвинение, а обвинение не е присъда. Червеният флаг в поръчка или законопроект е повод за въпрос, не доказателство за нарушение. При всяко съдебно дело показваме точния му статус (обвинен, подсъдим, осъден, оправдан, прекратено) и документа, на който се основава.</p>

        <H id="ednakvo">Еднакъв подход към всички</H>
        <p>
          За да се види дали не изкривяваме картината, тук броим какво сме записали за всяка страна. Броят се смята автоматично от данните на сайта.
          Разлика в броя не означава сама по себе си пристрастие: някои правителства са управлявали по-дълго, а случаите зависят от това какво са направили прокуратурата и съдът.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[15px] border-collapse">
            <thead><tr className="text-left border-b border-rule"><th className="py-1 pr-3">Правителство</th><th className="py-1 px-2 num">Обещания</th><th className="py-1 px-2 num">Изпълнени</th><th className="py-1 px-2 num">Частично / в процес</th><th className="py-1 px-2 num">Неизпълнени</th><th className="py-1 pl-2 num">Непроверени</th></tr></thead>
            <tbody>{PROMISES.parties.map((g) => {
              const st = g.promises.map((x) => x.status as string);
              const n = (...k: string[]) => st.filter((x) => k.includes(x)).length;
              return (
                <tr key={g.party} className="border-b border-rule">
                  <td className="py-1 pr-3">{g.party === "ПБ" ? "Правителство „Радев“ (Прогресивна България)" : g.name}</td>
                  <td className="py-1 px-2 num">{st.length}</td>
                  <td className="py-1 px-2 num">{n("done", "kept")}</td>
                  <td className="py-1 px-2 num">{n("partly", "in_progress", "at_risk")}</td>
                  <td className="py-1 px-2 num">{n("failed", "not_met", "broken")}</td>
                  <td className="py-1 pl-2 num">{n("not_assessed")}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
        <p className="text-[15px]">
          <b>Съдебни случаи по партия:</b>{" "}
          {Object.entries(CASES.cases.reduce<Record<string, number>>((a, c) => { const k = c.party || "без партия"; a[k] = (a[k] ?? 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} (${v})`).join(", ")}.{" "}
          <b>Проверени твърдения по автор:</b>{" "}
          {Object.entries(CHECKS.claims.reduce<Record<string, number>>((a, c) => { a[c.who] = (a[c.who] ?? 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} (${v})`).join(", ")}.
          Пълните списъци: <Link href="/obeshtaniya">обещания</Link>, <Link href="/proverki/sankcii">санкции и съдебни случаи</Link>, <Link href="/proverki">проверки</Link>.
        </p>

        <H id="iztochnici">Източници</H>
        <p>
          Използваме данни на НСИ, Министерството на финансите, БНБ, Народното събрание, Евростат, Сметната палата, Търговския регистър, ЦАИС ЕОП, СЕБРА (data.egov.bg) и общините.
          Медиите използваме само като източник на изказвания, не на факти.
        </p>
        <p>
          Част от данните (поименните гласувания, местната власт) взимаме обработени от отворения проект{" "}
          <a href="https://naiasno.bg" target="_blank" rel="noreferrer">„Наясно“</a> (лиценз MIT), който ги извлича от първоизточниците.
          Към всяко гласуване даваме линк към оригиналната стенограма.
        </p>
        <p>Числото само по себе си рядко казва нещо. Показваме го спрямо БВП, на човек, спрямо ЕС, спрямо предходни години и след инфлацията.</p>

        <H id="greshki">Грешки и поправки</H>
        <p>
          Когато сгрешим, поправяме видимо и пишем кога и какво сме променили. Ако видите грешка, натиснете „Съобщи за грешка“ в долната част на всяка страница.
          Сигналът е публичен (в GitHub) и в него се вижда как е решен. Моля, добавете източник, ако имате.
        </p>
        <div>
          <p className="font-semibold">Дневник на поправките</p>
          <ul className="mt-2 space-y-2 text-[15px]">
            {list.map((c, i) => (
              <li key={i} className="border-l-4 border-rule pl-3"><span className="text-muted num">{fmt(c.date)}</span> · <Link href={c.page}>страницата</Link>: {c.what}</li>
            ))}
          </ul>
        </div>
      </div>
    </Page>
  );
}
