import Link from "next/link";
import { Hemicycle } from "@/components/Hemicycle";
import { Anchor, SectionNav } from "@/components/SectionNav";
import { Term } from "@/components/Term";
import { Page, Title } from "@/components/ui";
import { CLAIMS } from "@/lib/checks";
import { lawIndex } from "@/lib/lawIndex";
import { MPS, currentSeats, formatDate } from "@/lib/parliament";
import { firmsOfMp } from "@/lib/people";
import { BAD, GOOD, data as PROMISES, govSlug } from "@/lib/promises";
import { SANCTIONS } from "@/lib/sanctions";

export const metadata = { title: "Властта: кой решава и как" };

// Един поглед върху властта: кой управлява, как се приемат законите, къде има сигнали и как да се проследи всяко решение.
export default function Vlast() {
  const seats = currentSeats();
  const total = seats.reduce((s, x) => s + x.seats, 0);
  const top = [...seats].sort((a, b) => b.seats - a.seats)[0];
  const gov = PROMISES.parties.find((g) => g.term === "current");
  const laws = lawIndex();
  const high = laws.filter((l) => l.signals.some((s) => s.level === "high"));
  const sameDay = laws.filter((l) => l.signals.some((s) => s.title === "Двете четения в един ден"));
  const fast = laws.filter((l) => l.signals.some((s) => /^Само \d+ дни между/.test(s.title)));
  const trans = laws.filter((l) => l.signals.some((s) => /преходните и заключителните/.test(s.title)));
  const cut = laws.filter((l) => l.signals.some((s) => /^Съкратен срок за предложения/.test(s.title)));
  const coi = laws.filter((l) => l.signals.some((s) => /конфликт на интереси/.test(s.title)));
  const mpFirms = MPS.map((m) => ({ m, firms: firmsOfMp(m.id) })).filter((x) => x.firms.length).sort((a, b) => b.firms.length - a.firms.length);
  const false_ = CLAIMS.filter((c) => c.verdict === "Невярно" || c.verdict === "Подвеждащо");
  const promises = PROMISES.parties.flatMap((g) => g.promises.map((p) => ({ g, p })));
  const good = promises.filter((x) => GOOD.includes(x.p.status)).length, bad = promises.filter((x) => BAD.includes(x.p.status)).length;

  const tiles: [string, string | number, string, string][] = [
    ["Закони със сериозен сигнал", high.length, `от ${laws.length} гласувани закона`, "#signali"],
    ["Нови текстове в заключителните разпоредби", trans.length, "закона, променени така на второ четене", "/parlament/signali"],
    ["Закони със съкратен срок за предложения", cut.length, "по-малко от обичайните 7 дни между четенията", "#signali"],
    ["Депутати с дял или управление във фирми", mpFirms.length, "по Търговския регистър и декларациите", "#firmi"],
    ["Неизпълнени обещания", bad, `при ${good} изпълнени, ${PROMISES.parties.length} правителства`, "/obeshtaniya"],
    ["Подвеждащи или неверни твърдения", false_.length, "проверени с източници", "/proverki"],
    ["Санкционирани по „Магнитски“ и др.", SANCTIONS.people.length, "български политици и длъжностни лица", "/proverki/sankcii"],
  ];

  return (
    <Page>
      <Title kicker="Власт" lead="Кой взема решенията, как се приемат законите и къде има особености, които заслужават внимание. Всяко число води към подробностите и първоизточника.">
        Властта: кой решава и как
      </Title>
      <SectionNav items={[["koy", "Кой управлява"], ["signali", "Сигнали"], ["kak", "Как се приема закон"], ["zakoni", "Законите"], ["firmi", "Депутати и фирми"], ["proverka", "Как да проверите"]]} />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-14">
        {tiles.map(([l, v, n, href]) => (
          <Link key={l} href={href} className="block bg-surface rounded-sm p-4 no-underline text-ink hover:ring-2 hover:ring-green">
            <p className="text-sm text-muted">{l}</p>
            <p className="display num text-[1.9rem] sm:text-[2.6rem] leading-none mt-1">{v}</p>
            <p className="text-xs text-muted mt-1">{n}</p>
          </Link>
        ))}
      </section>

      <Anchor id="koy" title="Кой управлява сега" lead={gov ? `${gov.role} (${gov.period}).` : undefined}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-start">
          <Hemicycle groups={seats} />
          <div className="text-[15px] space-y-3">
            <p>В парламента има {total} действащи депутати. Най-голямата група е <b>{top.label}</b> с {top.seats} места{top.seats > total / 2 ? " — самостоятелно мнозинство: може да приема закони без чужди гласове" : ""}.</p>
            <ul className="space-y-1">
              <li><Link href="/parlament">Как гласува всяка група и всеки депутат</Link></li>
              <li><Link href="/parlament/partii">Сравнение на партиите: присъствие, единство, съюзници</Link></li>
              {gov && <li><Link href={`/obeshtaniya/${govSlug(gov)}`}>Обещанията на управляващите и докъде са</Link></li>}
              <li><Link href="/byudzhet">Бюджетът: какво харчи държавата</Link></li>
              <li><Link href="/porachki">Обществените поръчки: кой взема парите</Link></li>
            </ul>
          </div>
        </div>
      </Anchor>

      <Anchor id="signali" title="Сигнали" lead="Особености в начина на приемане на законите, открити автоматично. Те не доказват нарушение, а показват къде да се прочете внимателно.">
        <div className="grid gap-4 md:grid-cols-3">
          <SignalList title="Съкратен срок за предложения" items={cut} why="Мнозинството гласува по-кратък срок за промени между четенията." />
          <SignalList title="Обявен конфликт на интереси" items={coi} why="Депутати са заявили в комисията, че имат потенциален конфликт на интереси." />
          <SignalList title="Двете четения в един ден" items={sameDay} why="Няма време за предложения и обсъждане между четенията." />
          <SignalList title="Под 7 дни между четенията" items={fast} why="По-малко време да се видят и оспорят промените." />
          <SignalList title="Нови текстове в заключителните разпоредби" items={trans} why="Там често се променят други закони, без обществено обсъждане." />
        </div>
      </Anchor>

      <Anchor id="kak" title="Как се приема закон и къде е рискът" lead="Седем стъпки. Червеното показва местата, където най-често се промъкват текстове в полза на тесен кръг.">
        <ol className="max-w-4xl space-y-3">
          {[
            ["Законопроект", "Внася го Министерският съвет или поне един депутат. Проектите на правителството минават 30-дневно обществено обсъждане; тези на депутатите — не.", true],
            ["Комисии", "Водещата комисия обсъжда проекта, кани становища от браншове, синдикати и институции и прави доклад.", false],
            ["Първо четене", <>Залата гласува идеята „по принцип“. <Term k="parvo-chetene">Какво е</Term>.</>, false],
            ["Предложения между четенията", "Депутатите внасят писмени предложения, обикновено за 7 дни. Срокът може да се съкрати.", true],
            ["Второ четене", <>Гласуване член по член. Тук се приемат и нови текстове, които ги нямаше в проекта. <Term k="vtoro-chetene">Какво е</Term>.</>, true],
            ["Преходни и заключителни разпоредби", "Последната част на закона. В нея с един параграф може да се промени съвсем друг закон.", true],
            ["Обнародване или вето", "Президентът подписва указ за обнародване в „Държавен вестник“ или връща закона с вето за ново обсъждане.", false],
          ].map(([t, d, risk], i) => (
            <li key={i} className={`grid grid-cols-[2rem_1fr] gap-3 p-3 rounded-sm ${risk ? "bg-[#fdeff1]" : "bg-surface"}`}>
              <span className="display num text-[1.6rem] leading-none text-muted">{i + 1}</span>
              <div><p className="font-semibold">{t}{risk ? <span className="text-xs text-red font-semibold ml-2">риск</span> : null}</p><p className="text-[15px] text-muted">{d}</p></div>
            </li>
          ))}
        </ol>
      </Anchor>

      <Anchor id="zakoni" title="Законите в този парламент" lead={<>{laws.length} закона с поименни гласувания. Подробно за всеки — етап, вносители, становища, сигнали и двете страни.</>}>
        <ul className="divide-y divide-rule border-y border-rule max-w-5xl">
          {laws.slice(0, 12).map((l) => (
            <li key={l.slug} className="py-2 flex flex-wrap justify-between gap-x-4">
              <Link href={`/parlament/zakon/${l.slug}`}>{l.name}</Link>
              <span className="text-sm text-muted">{formatDate(l.last)}{l.signals.some((s) => s.level === "high") && <b className="text-red"> · сигнал</b>}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 font-semibold"><Link href="/parlament/zakoni">Всички {laws.length} закона</Link></p>
      </Anchor>

      <Anchor id="firmi" title="Депутати и фирми" lead="Депутати, които по Търговския регистър или декларациите си са собственици или управители на фирми. Участието във фирма не е нарушение; важно е, когато фирмата работи с държавата.">
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {mpFirms.slice(0, 30).map(({ m, firms }) => (
            <li key={m.id} className="ring-1 ring-rule rounded-sm p-3 bg-white">
              <Link href={`/parlament/deputat/${m.id}`} className="font-semibold">{m.name}</Link>
              <p className="text-sm text-muted">{firms.length} {firms.length === 1 ? "фирма" : "фирми"} · {firms.slice(0, 3).map((f, i) => <span key={f.eik}>{i > 0 && ", "}<Link href={`/porachki/firma/${f.eik}`}>ЕИК {f.eik}</Link></span>)}</p>
            </li>
          ))}
        </ul>
        {mpFirms.length > 30 && <p className="text-sm text-muted mt-2">и още {mpFirms.length - 30}. Всеки е в профила на депутата.</p>}
      </Anchor>

      <Anchor id="proverka" title="Как да проверите сами">
        <ul className="max-w-3xl list-disc pl-5 space-y-2 text-[15px]">
          <li>Всяко гласуване води до стенограмата в parliament.bg. Всеки законопроект — до мотивите, докладите и становищата.</li>
          <li>Всяка фирма води до Търговския регистър, договорите ѝ с държавата и реалните плащания (СЕБРА).</li>
          <li>Липсващ документ (протокол, договор, сметка) може да се поиска по <Term k="zdoi">ЗДОИ</Term>. На страницата на всеки договор има готово заявление.</li>
          <li>Видите ли грешка или пропуск, пишете ни: поправяме и отбелязваме поправката.</li>
        </ul>
      </Anchor>
    </Page>
  );
}

function SignalList({ title, items, why }: { title: string; items: { slug: string; name: string }[]; why: string }) {
  return (
    <div className="ring-1 ring-rule rounded-sm p-4 bg-white">
      <p className="font-semibold">{title} <span className="num text-red">({items.length})</span></p>
      <p className="text-sm text-muted mb-2">{why}</p>
      {items.length ? (
        <ul className="text-[15px] space-y-1">{items.slice(0, 8).map((l) => <li key={l.slug}><Link href={`/parlament/zakon/${l.slug}`}>{l.name}</Link></li>)}</ul>
      ) : <p className="text-sm text-muted">Няма открити.</p>}
      {items.length > 8 && <p className="text-sm text-muted mt-1">и още {items.length - 8}</p>}
    </div>
  );
}
