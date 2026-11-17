import Link from "next/link";
import { Page, SectionTitle, Title } from "@/components/ui";
import { BAD, GOOD, ORDER, STATUS, data, govSlug, type Gov } from "@/lib/promises";

export const metadata = { title: "Обещано и изпълнено" };

function StatusBar({ g }: { g: Gov }) {
  const counts = ORDER.map((s) => ({ s, n: g.promises.filter((x) => x.status === s).length })).filter((x) => x.n);
  return (
    <div className="flex h-3 rounded-full overflow-hidden bg-surface">
      {counts.map(({ s, n }) => <div key={s} title={`${STATUS[s].label}: ${n}`} style={{ width: `${(n / g.promises.length) * 100}%`, background: STATUS[s].color }} />)}
    </div>
  );
}

export default function Obeshtaniya() {
  const current = data.parties.filter((p) => p.term === "current");
  const past = data.parties.filter((p) => p.term !== "current");
  const areas = [...new Set(data.parties.flatMap((p) => p.promises.map((x) => x.area)))].sort();
  return (
    <Page>
      <Title lead="Какво обещават партиите и какво правят, след като получат власт. Всяко обещание има източник, а всяка оценка има доказателство. Избери правителство.">
        Обещано и изпълнено
      </Title>

      {[["Сега на власт", current], ["Предишни правителства", past]].map(([label, list]) => (
        <section key={label as string} className="mb-12">
          <SectionTitle>{label as string}</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(list as Gov[]).map((g) => (
              <Link key={g.party} href={`/obeshtaniya/${govSlug(g)}`} className="block ring-1 ring-rule rounded-sm p-5 bg-white no-underline text-ink hover:ring-2 hover:ring-green">
                <p className="font-semibold text-lg leading-snug">{g.name}</p>
                <p className="text-sm text-muted mb-3">{g.period}</p>
                <StatusBar g={g} />
                <p className="text-sm mt-2 num">{g.promises.length} обещания · <span className="text-green">{g.promises.filter((x) => GOOD.includes(x.status)).length} изпълнени</span> · <span className="text-red">{g.promises.filter((x) => BAD.includes(x.status)).length} не</span></p>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <section className="mb-12">
        <SectionTitle>По теми</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-4">Едни и същи теми при различните правителства: кой какво е обещал и докъде е стигнал.</p>
        <div className="space-y-6">
          {areas.map((a) => (
            <div key={a}>
              <h3 className="font-semibold text-lg mb-2">{a}</h3>
              <ul className="divide-y divide-rule border-y border-rule text-[15px]">
                {data.parties.flatMap((g) => g.promises.map((x, i) => ({ g, x, i }))).filter(({ x }) => x.area === a).map(({ g, x, i }) => (
                  <li key={g.party + i} className="py-2 grid sm:grid-cols-[1fr_14rem_10rem] gap-x-4 gap-y-1 items-center">
                    <Link href={`/obeshtaniya/${govSlug(g)}#p${i}`}>{x.text}</Link>
                    <span className="text-sm text-muted">{g.name.replace(/\s*\(.*\)/, "")}</span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full justify-self-start" style={{ background: STATUS[x.status].color, color: STATUS[x.status].text }}>{STATUS[x.status].label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-3xl text-[15px]">
        <SectionTitle>Как оценяваме</SectionTitle>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Спазено досега</b>: няма действие срещу обещанието и има поне един документ, който го потвърждава.</li>
          <li><b>В процес</b>: има внесен или приет акт, но резултатът още не е постигнат.</li>
          <li><b>Под въпрос</b>: обещанието се спазва досега, но има официално предложение, което би го нарушило.</li>
          <li><b>Засега не е изпълнено</b>: официалните данни показват обратното на обещаното за текущия период.</li>
          <li><b>Нарушено</b>: управляващите са приели решение, което прави обещанието неизпълнимо.</li>
          <li>За приключилите мандати: <b>Изпълнено</b>, <b>Частично изпълнено</b> или <b>Не е изпълнено</b>, по резултата в края на мандата.</li>
          <li>Броят проследени обещания е малък и различен за всяко правителство, затова не изчисляваме процент „честност“. Избираме обещания, които могат да се измерят.</li>
        </ul>
        <p className="text-xs text-muted mt-3">Проверено: {data.updated}</p>
      </section>
    </Page>
  );
}
