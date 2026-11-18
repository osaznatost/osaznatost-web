import Link from "next/link";
import { OutcomeTag } from "@/components/parliament";
import { Page, SectionTitle, Title } from "@/components/ui";
import { PARTIES, VOTES, formatDate, partyBreakdown, partyName, partyPosition } from "@/lib/parliament";
import { lawFromTitle } from "@/lib/voteExplain";

export const metadata = { title: "Сигнали в законодателството" };

/** Сигнали, че закон може да облагодетелства тесен кръг: текстове, добавени между първо и второ четене,
 *  особено нови параграфи в преходните и заключителните разпоредби (там често се променят други закони). */
const SECOND = /второ гласуване/i;
const NEW = /(параграф|чл\.|член)[^,]*[–-]\s*нов(и|а)?(?![а-я])/i;
const TRANS = /преходни и заключителни|заключителни разпоредби|преходни разпоредби/i;

export default function Signali() {
  const sig = VOTES.filter((v) => SECOND.test(v.title) && NEW.test(v.title)).map((v) => ({ v, trans: TRANS.test(v.title), law: lawFromTitle(v.title) }))
    .sort((a, b) => Number(b.trans) - Number(a.trans) || (a.v.date < b.v.date ? 1 : -1));
  const trans = sig.filter((x) => x.trans);
  const groups = PARTIES;
  const support = Object.fromEntries(groups.map((g) => [g, sig.filter((x) => partyPosition(partyBreakdown(x.v)[g] ?? { y: 0, n: 0, a: 0, x: 0 }) === "y").length]));
  return (
    <Page>
      <Title back={{ href: "/parlament", label: "Парламент" }} kicker="Кой печели от закона?"
        lead="Текстове, добавени в закона чак на второ четене, когато вече няма обществено обсъждане. Най-рисковите са новите параграфи в „Преходни и заключителни разпоредби“: там често се променят други, несвързани закони в полза на конкретна група.">
        Сигнали в законодателството
      </Title>
      <section className="bg-surface rounded-sm p-4 mb-10 max-w-4xl text-[15px] space-y-2">
        <p><b>Какво е сигналът.</b> Законопроектът се обсъжда публично преди първо четене. След това депутатите могат да внасят предложения, които понякога променят смисъла на закона или добавят текстове по съвсем друга тема. Те минават по-бързо и с по-малко внимание.</p>
        <p><b>Какво не е.</b> Повечето нови текстове на второ четене са технически или полезни поправки. Сигналът е повод да се прочете текстът, не доказателство за лобизъм. За 10 закона имаме подробен анализ на мотивите и критиките.</p>
      </section>
      <section className="grid gap-4 sm:grid-cols-3 mb-10">
        {[["Гласувания с нови текстове на второ четене", sig.length], ["От тях в преходните и заключителните разпоредби", trans.length], ["Приети", sig.filter((x) => x.v.outcome !== "rejected").length]].map(([l, n]) => (
          <div key={l as string} className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">{l}</p><p className="display num text-[1.75rem] sm:text-[2.4rem] leading-none mt-1 break-words">{n}</p></div>
        ))}
      </section>
      <section className="mb-10 max-w-3xl">
        <SectionTitle>Кой ги подкрепя</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-3">В колко от тези гласувания мнозинството в групата е гласувало „за“.</p>
        <ul className="space-y-1 text-[15px]">{groups.filter((g) => support[g]).sort((a, b) => support[b] - support[a]).map((g) => (
          <li key={g} className="flex justify-between border-b border-rule py-1"><span>{partyName(g)}</span><b className="num">{support[g]} от {sig.length}</b></li>
        ))}</ul>
      </section>
      <section className="mb-12">
        <SectionTitle>Гласуванията</SectionTitle>
        <ul className="divide-y divide-rule border-y border-rule text-[15px]">{sig.map(({ v, trans: t, law }) => (
          <li key={v.id} className="py-2 grid sm:grid-cols-[7rem_1fr_auto] gap-x-3">
            <span className="text-sm text-muted num">{formatDate(v.date)}</span>
            <span>{t && <span className="text-xs font-semibold text-white bg-red rounded-full px-2 py-0.5 mr-2">заключителни разпоредби</span>}<Link href={`/parlament/glasuvane/${v.id}`}>{v.title}</Link>{law && <span className="block text-sm"><Link href={`/parlament/zakon/${law.slug}`}>всички гласувания по закона</Link></span>}</span>
            <OutcomeTag outcome={v.outcome} />
          </li>
        ))}</ul>
      </section>
      <p className="text-xs text-muted">Автоматично откриване по заглавията на поименните гласувания в parliament.bg. Обновява се всеки ден. Следваща стъпка: сравнение на текста на първо и второ четене и проверка кой е вносител на новите текстове.</p>
    </Page>
  );
}
