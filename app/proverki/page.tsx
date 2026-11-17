import Link from "next/link";
import { ClaimCard } from "@/components/ClaimCard";
import { Page, SectionTitle, Title } from "@/components/ui";
import { CLAIMS, DOSSIERS, VERDICTS, verdictCls } from "@/lib/checks";
import { formatDate } from "@/lib/parliament";
import { ClaimFilter } from "./ClaimList";

export const metadata = { title: "Проверки" };

export default function Proverki() {
  const people = [...new Set(CLAIMS.map((c) => c.who))].sort((a, b) => a.localeCompare(b, "bg"));
  const byPerson = people.map((p) => ({ p, party: CLAIMS.find((c) => c.who === p)?.party, list: CLAIMS.filter((c) => c.who === p && c.verdict !== "Мнение") }))
    .filter((x) => x.list.length && x.p !== "Публично твърдение").sort((a, b) => b.list.length - a.list.length);
  const factual = VERDICTS.filter((v) => v.v !== "Мнение");
  return (
    <Page>
      <Title lead="Политиците използват числа, за да убеждават. Тук разделяме публичните им изказвания на отделни твърдения и проверяваме всяко с официални данни и документи. Няма значение кой го е казал: всички минават по едни и същи правила.">
        Проверки
      </Title>

      <section className="mb-12 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div>
          <SectionTitle>Какво проверяваме</SectionTitle>
          <ul className="list-disc pl-5 space-y-1.5 text-[15px]">
            <li>Конкретни твърдения с число, дата или факт, които могат да се сравнят с документ: „дългът се удвои“, „пенсиите растат със 7,8%“.</li>
            <li>Избираме твърдения, които засягат много хора, разпространяват се широко или се използват като довод в гласуване.</li>
            <li>Проверяваме по равно управляващи и опозиция. Ако забележиш твърдение, което сме пропуснали, кажи ни.</li>
            <li>Мненията и политическите оценки не ги проверяваме. Отбелязваме ги като мнение и даваме контекста.</li>
          </ul>
        </div>
        <div>
          <SectionTitle>Присъдите</SectionTitle>
          <ul className="space-y-2">
            {VERDICTS.map((v) => (
              <li key={v.v} className="flex gap-3 items-start text-[15px]">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${v.cls}`}>{v.v}</span><span>{v.about}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mb-12">
          <Link href="/proverki/sankcii" className="block ring-2 ring-red rounded-sm p-4 bg-white no-underline text-ink hover:ring-4">
            <p className="font-semibold text-lg">Санкции за корупция →</p>
            <p className="text-[15px] text-muted">Българите в списъка „Магнитски“ и в британските санкции: кой, кога, за какво, по официалните документи. Ясно разграничение между сигнал, обвинение, присъда и санкция.</p>
          </Link>
        </section>

      {DOSSIERS.length > 0 && (
        <section className="mb-12">
          <SectionTitle>Подробни проверки</SectionTitle>
          <ul className="grid gap-3 md:grid-cols-2">
            {DOSSIERS.map((d) => {
              const cs = CLAIMS.filter((c) => c.dossier === d.slug);
              return (
                <li key={d.slug} className="ring-1 ring-rule rounded-sm p-4 bg-white">
                  <p className="text-sm text-muted">{formatDate(d.date)} · {d.topic}</p>
                  <Link href={`/proverki/${d.slug}`} className="text-xl font-semibold">{d.title}</Link>
                  <p className="text-[15px] mt-1">{d.lead}</p>
                  <p className="flex flex-wrap gap-1.5 mt-2">{cs.map((c) => <span key={c.id} className={`text-xs px-2 py-0.5 rounded-full ${verdictCls(c.verdict)}`}>{c.verdict}</span>)}</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="mb-12">
        <SectionTitle>Кой колко точно говори</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Броим само проверимите твърдения, без мненията. Проверките са още малко, затова това не е оценка за човека, а само за проверените му думи.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[15px]">
            <thead><tr className="text-left text-sm text-muted"><th className="py-2 pr-3">Кой</th>{factual.map((v) => <th key={v.v} className="py-2 pr-2 num">{v.v}</th>)}</tr></thead>
            <tbody>
              {byPerson.map(({ p, party, list }) => (
                <tr key={p} className="border-t border-rule">
                  <td className="py-2 pr-3">{p}{party && <span className="text-muted text-sm"> · {party}</span>}</td>
                  {factual.map((v) => { const n = list.filter((c) => c.verdict === v.v).length; return <td key={v.v} className="py-2 pr-2 num">{n || <span className="text-muted">–</span>}</td>; })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <SectionTitle>Всички проверени твърдения</SectionTitle>
        <ClaimFilter items={CLAIMS.map((c) => ({ id: c.id, verdict: c.verdict, who: c.who, topic: c.topic }))} verdicts={VERDICTS.map((v) => v.v)} people={people}>
          {CLAIMS.map((c) => <ClaimCard key={c.id} c={c} />)}
        </ClaimFilter>
      </section>
    </Page>
  );
}
