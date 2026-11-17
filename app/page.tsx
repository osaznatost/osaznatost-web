import Link from "next/link";
import { KeyNumber, Page, num, SectionTitle } from "@/components/ui";
import { NS, VOTES, formatDate } from "@/lib/parliament";
import { VoteBoard } from "@/components/parliament";
import { CPI_GROUPS, CPI_MONTHLY, DEBT_GDP, DEBT_GDP_SOURCE, P } from "@/lib/params";

const calcs = [
  { href: "/kalkulatori/kredit", t: "Кредит", d: "Колко ще ви струва и дали банката ще ви го отпусне." },
  { href: "/kalkulatori/lichna-inflaciya", t: "Лична инфлация", d: "Колко са поскъпнали точно вашите разходи." },
  { href: "/kalkulatori/slozhna-lihva", t: "Спестяване или инвестиране", d: "Какво става с парите след 10, 20, 30 години." },
  { href: "/kalkulatori/danaci", t: "Данъци по пътя", d: "От цената на труда ви колко стига до вас." },
  { href: "/kalkulatori/nuzhen-dohod", t: "Нужен доход", d: "Каква заплата ви трябва за живота, който искате." },
];

export default function Home() {
  const d25 = DEBT_GDP.at(-1)!;
  const d24 = DEBT_GDP.at(-2)!;
  const cpi = CPI_MONTHLY.at(-1)!;
  const top = [...CPI_GROUPS].sort((a, b) => b.rate - a.rate)[0];
  const [y, m] = cpi.period.split("-");
  const monthName = new Date(Number(y), Number(m) - 1).toLocaleDateString("bg-BG", { month: "long", year: "numeric" });

  // Най-оспорваното гласуване по закон от последните 30 дни в данните
  const cutoff = new Date(new Date(VOTES[0].date).getTime() - 30 * 864e5).toISOString().slice(0, 10);
  const featured = [...VOTES].filter((v) => v.date >= cutoff && /закон/i.test(v.title) && !/процедура/i.test(v.title))
    .sort((a, b) => (b.contest ?? 0) - (a.contest ?? 0))[0] ?? VOTES[0];

  return (
    <Page>
      <section className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-deep text-white -mt-8 sm:-mt-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 sm:pt-14 pb-12 grid gap-10 lg:grid-cols-[1fr_1.15fr] items-start">
          <div>
            <h1 className="display text-[3.6rem] sm:text-[5.2rem]">
              Какво прави държавата.<br />С числа и<br className="sm:hidden" /> източници.
            </h1>
            <p className="mt-6 text-lg text-white/80 max-w-md">
              Гласувания, бюджет, дълг и цени, проследени до първоизточника. Ние показваме данните, а изводите правите вие.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/parlament" className="no-underline bg-red hover:bg-red-dark text-white hover:text-white font-semibold px-5 py-3 rounded-md">Вижте гласуванията</Link>
              <Link href="/kalkulatori" className="no-underline ring-1 ring-white/40 hover:ring-white text-white hover:text-white px-5 py-3 rounded-md">Калкулатори</Link>
            </div>
          </div>
          <div className="bg-white/[0.06] rounded-xl p-5 sm:p-6 ring-1 ring-white/10">
            <p className="text-sm text-white/70">Последно оспорвано гласуване, {formatDate(featured.date)}</p>
            <p className="text-lg font-semibold mt-1 mb-5 leading-snug">
              <Link href={`/parlament/glasuvane/${featured.id}`} className="text-white hover:text-white no-underline hover:underline">{featured.title}</Link>
            </p>
            <VoteBoard vote={featured} dark size={10} />
            <p className="mt-5 text-[15px] text-white/85 num">
              <b className="text-white">{featured.outcome === "rejected" ? "Отхвърлено" : "Прието"}</b> с {featured.tally.yes} гласа „за“, {featured.tally.no} „против“ и {featured.tally.abstain} „въздържал се“. {featured.tally.absent} не гласуваха.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-3 mt-10 mb-16">
        <KeyNumber
          label="Държавен дълг, 2025"
          value={`${num(d25.value)}%`}
          note={`от БВП · ${d25.value > d24.value ? "+" : ""}${num(d25.value - d24.value)} пр.п. за година`}
          source={{ title: "Евростат", url: DEBT_GDP_SOURCE.url }}
          href="/pari/dalg"
        />
        <KeyNumber
          label={`Инфлация, ${monthName}`}
          value={`${num(cpi.value)}%`}
          note={`на година · най-много поскъпва: ${top.label.toLowerCase()} (+${num(top.rate)}%)`}
          source={{ title: "НСИ", url: P.cpiYoY.source.url }}
          href="/kalkulatori/lichna-inflaciya"
        />
        <KeyNumber
          label="Минимална заплата, 2026"
          value={`${num(P.minWage.value, 2)} €`}
          note={`бруто · нето ≈ ${num(P.minWage.value * (1 - P.employeeRate.value) * 0.9, 2)} €`}
          source={P.minWage.source}
          href="/kalkulatori/danaci"
        />
      </section>

      <section className="mb-14">
        <SectionTitle right={<Link href="/kalkulatori">Всички</Link>}>Калкулатори</SectionTitle>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {calcs.map((c) => (
            <li key={c.href}>
              <Link href={c.href} className="group block h-full no-underline rounded-lg p-5 bg-white ring-1 ring-rule hover:ring-green hover:bg-surface">
                <span className="display block text-[1.7rem] text-ink group-hover:text-green">{c.t}</span>
                <span className="block text-muted text-[15px] mt-2">{c.d}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-10 md:grid-cols-2">
        <div>
          <SectionTitle>Първа проверка</SectionTitle>
          <p className="text-lg font-semibold">Дългът: два поста, противоположни изводи</p>
          <p className="text-muted mt-2">
            Два поста за един и същи бюджет с противоположни изводи. Разделихме ги на отделни твърдения и проверяваме всяко срещу данните на МФ и Евростат.
          </p>
          <p className="mt-3"><Link href="/proverki/dalg-2026">Прочетете проверката</Link></p>
        </div>
        <div>
          <SectionTitle>Парламент</SectionTitle>
          <p className="text-muted mb-3">Всички поименни гласувания на 52-рото Народно събрание: кой как гласува, колко присъстват групите и с кого гласуват еднакво.</p>
          <p className="mb-8"><Link href="/parlament">Вижте гласуванията</Link></p>
          <SectionTitle>Скоро</SectionTitle>
          <ul className="space-y-2 text-muted">
                        <li><span className="text-ink font-semibold">Обещания</span>: обещано срещу изпълнено, по партии</li>
            <li><span className="text-ink font-semibold">Поръчки</span>: кой печели обществените пари и кой стои зад фирмата</li>
            <li><span className="text-ink font-semibold">Статистики</span>: всичко за България, с история и сравнение с ЕС</li>
          </ul>
        </div>
      </section>
    </Page>
  );
}
