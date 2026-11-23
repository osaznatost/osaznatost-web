import Link from "next/link";
import { KeyNumber, Page, num, SectionTitle } from "@/components/ui";
import { VOTES, formatDate } from "@/lib/parliament";
import { VoteBoard } from "@/components/parliament";
import { HomeFeed } from "@/components/HomeFeed";
import { CPI_GROUPS, CPI_MONTHLY, DEBT_GDP, DEBT_GDP_SOURCE, P } from "@/lib/params";
import { data } from "@/lib/data";

/** Кошницата от 20 основни стоки по данните на „Колко струва“ (сбор от типичните цени). */
async function basket() {
  const L = await data<{ date: string; basket: number[]; cats: Record<string, { med: number }> }>("prices/latest.json");
  const H = await data<{ dates: string[]; cats: Record<string, Record<string, number>> }>("prices/history.json");
  if (!L || !H) return null;
  const ids = L.basket.filter((id) => L.cats[String(id)] && H.cats[String(id)]?.[H.dates[0]]);
  const now = ids.reduce((s, id) => s + L.cats[String(id)].med, 0), first = ids.reduce((s, id) => s + H.cats[String(id)][H.dates[0]], 0);
  return ids.length ? { now, change: (now / first - 1) * 100, n: ids.length, date: L.date, from: H.dates[0] } : null;
}

const calcs = [
  { href: "/kalkulatori/kredit", t: "Кредит", d: "Колко ще ви струва и дали банката ще ви го отпусне." },
  { href: "/kalkulatori/lichna-inflaciya", t: "Лична инфлация", d: "Колко са поскъпнали точно вашите разходи." },
  { href: "/kalkulatori/slozhna-lihva", t: "Спестяване или инвестиране", d: "Какво става с парите след 10, 20, 30 години." },
  { href: "/kalkulatori/danaci", t: "Данъци по пътя", d: "От цената на труда ви колко стига до вас." },
  { href: "/kalkulatori/nuzhen-dohod", t: "Нужен доход", d: "Каква заплата ви трябва за живота, който искате." },
];

export default async function Home() {
  const b = await basket();
  const d25 = DEBT_GDP.at(-1)!;
  const d24 = DEBT_GDP.at(-2)!;
  const cpi = CPI_MONTHLY.at(-1)!;
  const top = [...CPI_GROUPS].sort((a, b) => b.rate - a.rate)[0];
  const [y, m] = cpi.period.split("-");
  const monthName = new Date(Number(y), Number(m) - 1).toLocaleDateString("bg-BG", { month: "long", year: "numeric" });

  // Най-оспорваното гласуване по закон от последното заседание (ако в този ден няма закон — от последната седмица)
  const lastDay = VOTES.reduce((m, v) => (v.date > m ? v.date : m), "");
  const isLaw = (v: (typeof VOTES)[number]) => /закон/i.test(v.title) && !/процедура/i.test(v.title);
  const weekAgo = new Date(new Date(lastDay).getTime() - 6 * 864e5).toISOString().slice(0, 10);
  const pool = VOTES.filter((v) => v.date === lastDay && isLaw(v));
  const featured = (pool.length ? pool : VOTES.filter((v) => v.date >= weekAgo && isLaw(v)))
    .sort((a, b) => (b.contest ?? 0) - (a.contest ?? 0))[0] ?? VOTES[0];
  const dayCount = VOTES.filter((v) => v.date === lastDay).length;

  return (
    <Page>
      <section className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-deep text-white -mt-8 sm:-mt-12">
        <div className="mx-auto max-w-[88rem] px-4 sm:px-6 pt-8 sm:pt-14 pb-10 sm:pb-12 grid gap-8 sm:gap-10 lg:grid-cols-[1fr_1.15fr] items-start">
          <div>
            <h1 className="display text-[2.9rem] sm:text-[5.2rem]">
              Какво прави държавата.<br />С числа и източници.
            </h1>
            <p className="mt-4 sm:mt-6 text-[17px] sm:text-lg text-white/80 max-w-md">
              Гласувания, бюджет, дълг и цени, проследени до първоизточника. Ние показваме данните, а изводите правите вие.
            </p>
            <form action="/tarsene" className="mt-6 sm:mt-8 flex gap-2 max-w-md">
              <input name="q" placeholder="напр. асфалт Ботевград 2024" className="flex-1 rounded-md px-4 py-3 text-ink bg-white text-[16px]" />
              <button className="bg-red hover:bg-red-dark text-white font-semibold px-4 rounded-md">Търси</button>
            </form>
            <div className="mt-4 hidden sm:flex flex-wrap gap-3">
              <Link href="/parlament" className="no-underline bg-red hover:bg-red-dark text-white hover:text-white font-semibold px-5 py-3 rounded-md">Вижте гласуванията</Link>
              <Link href="/kalkulatori" className="no-underline ring-1 ring-white/40 hover:ring-white text-white hover:text-white px-5 py-3 rounded-md">Калкулатори</Link>
            </div>
          </div>
          <div className="bg-white/[0.06] rounded-xl p-5 sm:p-6 ring-1 ring-white/10">
            <p className="text-sm text-white/70">{featured.date === lastDay ? "Най-оспорваното гласуване от последното заседание" : "Най-оспорваното гласуване от последната седмица"}, {formatDate(featured.date)}</p>
            <p className="text-lg font-semibold mt-1 mb-5 leading-snug">
              <Link href={`/parlament/glasuvane/${featured.id}`} className="text-white hover:text-white no-underline hover:underline">{featured.title}</Link>
            </p>
            <VoteBoard vote={featured} dark size={10} />
            <p className="mt-5 text-[15px] text-white/85 num">
              <b className="text-white">{featured.outcome === "rejected" ? "Отхвърлено" : "Прието"}</b> с {featured.tally.yes} гласа „за“, {featured.tally.no} „против“ и {featured.tally.abstain} „въздържал се“. {featured.tally.absent} не гласуваха.
            </p>
            <p className="mt-3 text-sm text-white/70">На {formatDate(lastDay)} е имало {dayCount} гласувания. <Link href="/parlament#zasedaniya" className="text-white underline">Виж всички</Link>. Данните се обновяват автоматично всяка сутрин и вечер в дните на заседания.</p>
          </div>
        </div>
      </section>

      <section className={`grid grid-cols-2 gap-3 sm:gap-5 ${b ? "lg:grid-cols-4" : "lg:grid-cols-3"} mt-8 sm:mt-10 mb-12 sm:mb-16`}>
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
        {b && (
          <KeyNumber
            label={`Кошница от ${b.n} основни стоки`}
            value={`${num(b.now, 2)} €`}
            note={`${b.change > 0 ? "+" : ""}${num(b.change)}% от ${b.from.split("-").reverse().join(".")} · по вериги и градове`}
            source={{ title: "КЗП, „Колко струва“", url: "https://kolkostruva.bg" }}
            href="/ceni"
          />
        )}
      </section>

      <section className="mb-14">
        <SectionTitle right={<Link href="/kalkulatori">Всички</Link>}>Калкулатори</SectionTitle>
        <ul className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {calcs.map((c) => (
            <li key={c.href}>
              <Link href={c.href} className="group block h-full no-underline rounded-lg p-4 sm:p-5 bg-white ring-1 ring-rule hover:ring-green hover:bg-surface">
                <span className="display block text-[1.4rem] sm:text-[1.7rem] leading-tight text-ink group-hover:text-green">{c.t}</span>
                <span className="hidden sm:block text-muted text-[15px] mt-2">{c.d}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <HomeFeed />
    </Page>
  );
}
