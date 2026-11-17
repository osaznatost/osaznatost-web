import Link from "next/link";
import { Label, Page, Title, SectionTitle } from "@/components/ui";

export const metadata = { title: "Проверка: дългът" };

type Status = "confirmed" | "partly" | "pending" | "opinion" | "unverifiable";
const statusText: Record<Status, string> = {
  confirmed: "Съвпада с данните",
  partly: "Частично потвърдено",
  pending: "В проверка",
  opinion: "Мнение",
  unverifiable: "Не може да се провери като факт",
};
const statusClass: Record<Status, string> = {
  confirmed: "bg-green-soft text-green",
  partly: "bg-green-soft text-green",
  pending: "bg-surface text-muted",
  opinion: "bg-white text-muted border border-dashed border-muted",
  unverifiable: "bg-white text-muted border border-dashed border-muted",
};

const claims: { who: string; text: string; kind: "claim" | "opinion"; status: Status; why: string }[] = [
  { who: "Христо Гаджев", text: "За по-малко от пет месеца властта е поела 5,3 млрд. € нов дълг.", kind: "claim", status: "pending", why: "Предварително: правителството е избрано на 8 май 2026 г. Емисиите на държавни ценни книжа оттогава до началото на октомври са около 3,1 млрд. € (2,5 млрд. € еврооблигации през юли и около 0,55 млрд. € на вътрешния пазар). Разликата до 5,3 млрд. € може да идва от заеми извън пазара, например от ЕС, които тези данни не включват. Нужни са бюлетините на МФ за пълната сума." },
  { who: "Христо Гаджев", text: "За 2027 г. искат да поемат още 8,6 млрд. € нов дълг.", kind: "claim", status: "confirmed", why: "Съвпада с плана в проектобюджета за 2027 г.: 8,6 млрд. €, после 8,5 (2028) и 7,9 млрд. € (2029). Това е план, не изпълнение." },
  { who: "Христо Гаджев", text: "На фона на този бюджет и Жан Виденов изглежда симпатичен.", kind: "opinion", status: "opinion", why: "Сравнение, не проверимо твърдение. Контекст: дългът е 244,5% от БВП през 1996 г. и 29,9% през 2025 г. (Евростат)." },
  { who: "Георги Вълджев", text: "Най-много дълг за последните шест години е планиран и поет през 2025 г., при финансов министър Теменужка Петкова.", kind: "claim", status: "pending", why: "Нужен е новият дълг по години за 2020–2025 г. от отчетите на МФ." },
  { who: "Георги Вълджев", text: "Таванът за нов дълг през 2026 г. е 10,1 млрд. € срещу 9,64 млрд. € през 2025 г.", kind: "claim", status: "partly", why: "10,1 млрд. € за 2026 г. е потвърдено (от тях 3,26 млрд. € по SAFE). Сумата 9,64 млрд. € за 2025 г. още не е проверена." },
  { who: "Георги Вълджев", text: "За 2027 г. новопоетият дълг започва да намалява.", kind: "claim", status: "confirmed", why: "По плана: 8,6 млрд. € за 2027 г. срещу таван 10,1 млрд. € за 2026 г. Отново план, не изпълнение." },
  { who: "Георги Вълджев", text: "Дългът, поет през 2025 г., е почти двоен спрямо 2024 г.", kind: "claim", status: "pending", why: "Предварително, само по пазарните емисии: около 8,9 млрд. € през 2025 г. срещу около 5,4 млрд. € през 2024 г., тоест около 1,7 пъти. Без заемите от ЕС и други институции. Нужни са отчетите на МФ за пълната сума." },
  { who: "Георги Вълджев", text: "Сметната палата е показала скрити разходи в АПИ.", kind: "claim", status: "pending", why: "Търсим одитния доклад на Сметната палата, за да го цитираме директно." },
  { who: "Георги Вълджев", text: "Пеевски е трябвало да си „купува МВР“ чрез тяхното правителство.", kind: "opinion", status: "unverifiable", why: "Политическо обвинение без посочен документ. Показваме го като оценка на автора." },
];

export default function Proverka() {
  return (
    <Page narrow>
      <Title kicker="Проверка · 17 ноември 2026" lead="Двама души, един бюджет, противоположни изводи. Разделихме постовете им на отделни твърдения и ги сравняваме с официалните данни.">
        Дългът: два поста, противоположни изводи
      </Title>

      <section className="mb-10">
        <SectionTitle>Накратко</SectionTitle>
        <ul className="list-disc pl-5 space-y-2">
          <li>И двамата цитират реални планови числа, но подбират различни години за сравнение.</li>
          <li>Това, което и двамата пропускат: дългът е <strong>23,8% от БВП през 2024 г. и 29,9% през 2025 г.</strong> (Евростат). Това е най-големият годишен ръст от 2014 г. насам.</li>
          <li>В същото време България остава сред държавите с най-нисък дълг в ЕС, далеч под прага от 60%.</li>
          <li>Част от новия дълг за 2026 г. (3,26 млрд. €) е целеви заем за отбрана по SAFE, не текущи разходи.</li>
        </ul>
      </section>

      <section>
        <SectionTitle>Твърдение по твърдение</SectionTitle>
        <p className="text-sm text-muted mb-4">Проверката още не е завършена. Отбелязваме открито кое не сме потвърдили.</p>
        <ol className="space-y-6">
          {claims.map((c, i) => (
            <li key={i} className="border-b border-rule pb-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-sm font-semibold">{c.who}</span>
                <Label kind={c.kind} />
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-sm ${statusClass[c.status]}`}>{statusText[c.status]}</span>
              </div>
              <p className="text-lg">{c.text}</p>
              <p className="text-[15px] text-muted mt-2">{c.why}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10 text-sm text-muted">
        <h2 className="text-base font-bold text-ink mb-2">Източници</h2>
        <ul className="space-y-1">
          <li><a href="https://ec.europa.eu/eurostat/databrowser/view/gov_10dd_edpt1/default/table" target="_blank" rel="noreferrer">Евростат, брутен дълг като % от БВП</a></li>
          <li><a href="https://www.capital.bg/politika_i_ikonomika/ikonomika/2026/07/15/4935480_bjudjet_2026_kakvo_triabva_da_znaem/" target="_blank" rel="noreferrer">Капитал, „Бюджет 2026: какво трябва да знаем“ (15.07.2026)</a></li>
          <li><a href="https://www.capital.bg/en/economy/2026/11/06/4977193_bulgarias_2027_budget_slight_spending_cuts_and_new/" target="_blank" rel="noreferrer">Капитал, бюджет 2027 (06.11.2026)</a></li>
          <li><a href="https://github.com/atanasster/electionsbg" target="_blank" rel="noreferrer">„Наясно“: емисии на държавни ценни книжа (по данни на БНБ и МФ)</a></li>
          <li>Постовете на Христо Гаджев и Георги Вълджев във Facebook, ноември 2026</li>
        </ul>
        <p className="mt-4"><Link href="/pari/dalg">Всички данни за дълга</Link></p>
      </section>
    </Page>
  );
}
