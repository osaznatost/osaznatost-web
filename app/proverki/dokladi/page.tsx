import Link from "next/link";
import { AuditsList } from "@/components/AuditsList";
import { Page, SectionTitle, Title } from "@/components/ui";
import { auditsFile } from "@/lib/audits";
import { findMunicipality } from "@/lib/places";
import { oblastSlug, muniSlug } from "@/lib/regions";

export const metadata = { title: "Доклади на контролните органи", description: "Какво казват последните доклади на Европейската прокуратура, ОЛАФ, Сметната палата и АДФИ за България." };

type Fact = [string, string];
const Box = ({ title, period, facts, note, links }: { title: string; period: string; facts: Fact[]; note?: string; links: { title: string; url: string }[] }) => (
  <section className="mb-10 max-w-4xl">
    <SectionTitle>{title}</SectionTitle>
    <p className="text-sm text-muted -mt-3 mb-3">{period}</p>
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-3">
      {facts.map(([v, l]) => (
        <div key={l} className="bg-surface rounded-sm p-4"><dt className="text-sm text-muted">{l}</dt><dd className="display text-[1.8rem] leading-tight mt-1">{v}</dd></div>
      ))}
    </dl>
    {note && <p className="text-[15px] mb-2">{note}</p>}
    <p className="text-sm">Източници: {links.map((x, i) => <span key={x.url}>{i ? " · " : ""}<a href={x.url} target="_blank" rel="noreferrer">{x.title}</a></span>)}</p>
  </section>
);

export default async function Dokladi() {
  const A = await auditsFile();
  const items = A?.items ?? [];
  const crim = items.filter((a) => a.kind === "след наказателно производство");
  const recent = items.filter((a) => a.kind !== "финансов одит" && a.kind !== "след наказателно производство");
  const byMuni = new Map<string, number>();
  for (const a of items) for (const c of a.munis) byMuni.set(c, (byMuni.get(c) ?? 0) + 1);
  return (
    <Page>
      <Title back={{ href: "/proverki", label: "Проверки" }} kicker="Контролните органи"
        lead="Основните числа от последните годишни доклади на органите, които разследват и проверяват как се харчат публичните пари. Преписваме числата, без да ги тълкуваме; пълните доклади са в линковете.">
        Доклади на контролните органи
      </Title>

      <Box title="Европейска прокуратура (EPPO)" period="Годишен доклад за 2025 г., данни към 31.12.2025"
        facts={[["267", "активни разследвания в България"], ["1,7 млрд. €", "оценена щета по тях"], ["82", "образувани през 2025 г. (щета 702 млн. €)"], ["18", "дела за ДДС и мита (487,44 млн. €)"], ["84 / 71", "по програми за регионално развитие / земеделие"], ["21", "с трансгранично измерение"]]}
        note="За сравнение: Европейската прокуратура има общо 3 602 активни разследвания в 24 държави с обща оценена щета 67,27 млрд. €."
        links={[{ title: "EPPO: статистика за България", url: "https://www.eppo.europa.eu/assets/annual-report-2025/pdfs/statistics-member-state/Bulgaria_en.pdf" }, { title: "EPPO: 2025 в числа", url: "https://www.eppo.europa.eu/en/2025-numbers" }, { title: "БТА", url: "https://www.bta.bg/en/news/bulgaria/1075353-bulgaria-in-european-public-prosecutor-s-office-report-2025-82-fraud-investigat" }]} />

      <Box title="Европейска служба за борба с измамите (ОЛАФ)" period="Годишен доклад за 2025 г."
        facts={[["0", "повдигнати обвинения в България по препоръки на ОЛАФ (2021–2025)"], ["42", "проверки в България за периода"], ["5", "случая, прекратени от българските власти"], ["38 млн. €", "препоръчани за връщане по ж.п. линията Костенец–Септември (2025)"]]}
        note="За целия ЕС през 2025 г. ОЛАФ препоръча да бъдат върнати 597 млн. €."
        links={[{ title: "ОЛАФ: доклад 2025", url: "https://ec.europa.eu/olaf-report/2025/index_en.html" }, { title: "БТА: няма обвинения от 2021 г.", url: "https://www.bta.bg/en/news/1109699-bulgaria-brings-no-charges-on-eu-anti-fraud-office-recommendations-since-2021" }, { title: "БНР: Костенец–Септември", url: "https://bnr.bg/en/post/101868686/olaf-recommends-recovery-of-eur-38-million-by-bulgaria-over-suspected-irregularities-in-railway-infrastructure-project" }]} />

      <Box title="Сметна палата" period="Финансови одити, извършени през 2025 г. (на отчетите за 2024 г.)"
        facts={[["337", "одитни доклада"], ["278", "чисто мнение (82%)"], ["47 / 12", "мнение с резерви / отрицателно"], ["3,86 млрд. лв.", "неправилни отчитания, открити при одита"], ["487 млн. лв.", "от тях некоригирани"]]}
        note="Преди да бъдат нанесени поправките, отрицателните мнения биха били 97."
        links={[{ title: "Доклад за финансовите одити 2025", url: "https://www.bulnao.government.bg/bg/documents/17407/Doklad_FO_2025_all.pdf" }, { title: "Одит на партиите за 2024 г.", url: "https://www.bulnao.government.bg/bg/documents/15556/OD_PP-2024.pdf" }]} />

      <Box title="Агенция за държавна финансова инспекция (АДФИ)" period="Годишен отчет за 2023 г. (последният намерен публикуван)"
        facts={[["454", "финансови инспекции"], ["592 от 1 407", "проверени обществени поръчки с нарушения (42%)"], ["1 404", "акта за административни нарушения"], ["112", "доклада до прокуратурата"]]}
        links={[{ title: "Отчет на АДФИ (strategy.bg)", url: "https://strategy.bg/download/1283023" }]} />

      <p className="text-sm text-muted max-w-3xl">
        Конкретните дела срещу политици са в <Link href="/proverki/sankcii">Санкции и съдебни случаи</Link>. Числата тук се обновяват ръчно веднъж годишно, когато излезе новият доклад.
      </p>
      {items.length > 0 && (
        <>
          <section className="mb-10 max-w-4xl">
            <SectionTitle>Последните одитни доклади на Сметната палата</SectionTitle>
            <p className="text-sm text-muted -mt-3 mb-4">Общо {items.length.toLocaleString("bg-BG")} доклада от {Math.min(...items.map((a) => a.year))} г. насам; {byMuni.size} общини имат поне един. Пълният текст е в PDF-а на Сметната палата.</p>
            <AuditsList items={recent} limit={15} />
          </section>
          {crim.length > 0 && (
            <section className="mb-10 max-w-4xl">
              <SectionTitle>Доклади, публикувани след приключило наказателно производство</SectionTitle>
              <p className="text-sm text-muted -mt-3 mb-4">Сметната палата публикува тези доклади едва когато делото, по което са били изпратени на прокуратурата, приключи.</p>
              <AuditsList items={crim} limit={15} />
            </section>
          )}
          <section className="mb-10 max-w-4xl">
            <SectionTitle>Общините с най-много одити</SectionTitle>
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-[15px]">{[...byMuni].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([c, n]) => {
              const m = findMunicipality(c);
              return <li key={c} className="flex justify-between border-b border-rule py-1"><a href={`/mesta/${oblastSlug(c)}/${muniSlug(c)}#oditi`}>{m?.name ?? c}</a><span className="num">{n}</span></li>;
            })}</ul>
            <p className="text-xs text-muted mt-2">Източник: <a href={A!.source}>Сметна палата, одитна дейност</a>, обновено {A!.updated.split("-").reverse().join(".")}.</p>
          </section>
        </>
      )}
    </Page>
  );
}
