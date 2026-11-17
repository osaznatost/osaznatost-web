import Link from "next/link";
import { KeyNumber, Page, num, SectionTitle } from "@/components/ui";
import { MPS, NS, VOTES } from "@/lib/parliament";
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

  return (
    <Page>
      <section className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-green text-white -mt-8 sm:-mt-12 mb-0">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 sm:pt-16 pb-24 sm:pb-28 grid gap-8 md:grid-cols-[1.4fr_1fr] items-end">
          <div>
            <h1 className="text-4xl sm:text-[3.4rem] font-bold tracking-tight leading-[1.05]">
              Какво прави държавата.<br />С числа и източници.
            </h1>
            <p className="mt-5 text-lg text-white/80 max-w-xl">
              Гласувания, бюджет, дълг и цени, проследени до първоизточника. Ние показваме данните, а изводите правите вие.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/parlament" className="no-underline bg-red hover:bg-red-dark text-white hover:text-white font-semibold px-5 py-3 rounded">Вижте гласуванията</Link>
              <Link href="/kalkulatori" className="no-underline border border-white/40 hover:border-white text-white hover:text-white px-5 py-3 rounded">Калкулатори</Link>
            </div>
          </div>
          <ul className="text-white/85 text-[15px] space-y-2 border-l border-white/25 pl-5">
            <li><b className="text-white">{num(VOTES.length, 0)}</b> поименни гласувания в {NS}-ото Народно събрание</li>
            <li><b className="text-white">{MPS.length}</b> депутати с присъствие и позиции</li>
            <li><b className="text-white">5</b> калкулатора с актуалните ставки за 2026 г.</li>
            <li>Всяко число с източник и дата</li>
          </ul>
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-3 mb-14 -mt-14 relative">
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
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8">
          {calcs.map((c) => (
            <li key={c.href} className="border-b border-rule py-4">
              <Link href={c.href} className="font-semibold text-lg">{c.t}</Link>
              <p className="text-muted text-[15px] mt-1">{c.d}</p>
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
          <p className="mt-3"><Link href="/proverki/dalg-2026">Прочетете проверката →</Link></p>
        </div>
        <div>
          <SectionTitle>Парламент</SectionTitle>
          <p className="text-muted mb-3">Всички поименни гласувания на 52-рото Народно събрание: кой как гласува, колко присъстват групите и с кого гласуват еднакво.</p>
          <p className="mb-8"><Link href="/parlament">Вижте гласуванията →</Link></p>
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
