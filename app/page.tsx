import Link from "next/link";
import { KeyNumber, Page, num } from "@/components/ui";
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
      <section className="max-w-3xl mb-12">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1]">
          Какво прави държавата. С числа и източници.
        </h1>
        <p className="mt-4 text-lg text-muted">
          Гласувания, бюджет, дълг и цени, проследени до първоизточника. Ние показваме данните, а изводите правите вие.
        </p>
      </section>

      <section className="grid gap-8 sm:grid-cols-3 mb-14">
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
        <div className="flex items-baseline justify-between border-b border-ink pb-2 mb-4">
          <h2 className="text-xl font-bold">Калкулатори</h2>
          <Link href="/kalkulatori" className="text-sm">Всички</Link>
        </div>
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
          <h2 className="text-xl font-bold border-b border-ink pb-2 mb-4">Първа проверка</h2>
          <p className="text-lg font-semibold">Дългът: два поста, противоположни изводи</p>
          <p className="text-muted mt-2">
            Два поста за един и същи бюджет с противоположни изводи. Разделихме ги на отделни твърдения и проверяваме всяко срещу данните на МФ и Евростат.
          </p>
          <p className="mt-3"><Link href="/proverki/dalg-2026">Прочетете проверката →</Link></p>
        </div>
        <div>
          <h2 className="text-xl font-bold border-b border-ink pb-2 mb-4">Скоро</h2>
          <ul className="space-y-2 text-muted">
            <li><span className="text-ink font-semibold">Парламент</span>: всяко гласуване и кой как е гласувал</li>
            <li><span className="text-ink font-semibold">Обещания</span>: обещано срещу изпълнено, по партии</li>
            <li><span className="text-ink font-semibold">Поръчки</span>: кой печели обществените пари и кой стои зад фирмата</li>
            <li><span className="text-ink font-semibold">Статистики</span>: всичко за България, с история и сравнение с ЕС</li>
          </ul>
        </div>
      </section>
    </Page>
  );
}
