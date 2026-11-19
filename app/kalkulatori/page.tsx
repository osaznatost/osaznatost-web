import Link from "next/link";
import { Page, SectionTitle, Title } from "@/components/ui";
import { annuityPayment, futureValue, realValue, salary } from "@/lib/calc";
import { CPI_GROUPS, P } from "@/lib/params";

export const metadata = { title: "Калкулатори" };

const eur = (n: number, d = 0) => new Intl.NumberFormat("bg-BG", { style: "currency", currency: "EUR", maximumFractionDigits: d }).format(n);
const pct = (n: number, d = 1) => `${(n * 100).toLocaleString("bg-BG", { maximumFractionDigits: d })}%`;

function Bar({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  return (
    <div>
      <div className="flex h-5 rounded-sm overflow-hidden">
        {parts.map((p) => <div key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} title={`${p.label}: ${eur(p.value)}`} />)}
      </div>
      <ul className="mt-2 grid gap-1 text-sm">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} />{p.label}</span>
            <span className="num font-semibold">{eur(p.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Card({ href, kicker, title, children, cta }: { href: string; kicker: string; title: string; children: React.ReactNode; cta: string }) {
  return (
    <article className="ring-1 ring-rule rounded-sm bg-white flex flex-col">
      <div className="p-5 pb-4 flex-1">
        <p className="text-sm text-green font-semibold">{kicker}</p>
        <h2 className="display text-[2rem] leading-none mt-1 mb-4">{title}</h2>
        {children}
      </div>
      <Link href={href} className="no-underline border-t border-rule px-5 py-3 font-semibold text-red hover:bg-surface">{cta}</Link>
    </article>
  );
}

export default function Kalkulatori() {
  // Примери с актуалните параметри: числата се преизчисляват при всяка промяна на ставките.
  const loan = 150_000, years = 30;
  const pay = annuityPayment(loan, P.mortgageRate.value, years * 12);
  const interest = pay * years * 12 - loan;

  const gross = 1_500;
  const s = salary(gross, { employeeRate: P.employeeRate.value, employerRate: P.employerRate.value, incomeTax: P.incomeTax.value, maxInsurable: P.maxInsurable.value });
  const vat = s.net * 0.6 * (P.vatStd.value / (1 + P.vatStd.value));

  const monthly = 200, horizon = 20;
  const saved = monthly * 12 * horizon;
  const mattress = realValue(saved, P.cpiYoY.value, horizon / 2);
  const deposit = futureValue({ start: 0, monthly, annualRate: P.depositRate.value, years: horizon }).value;
  const invested = futureValue({ start: 0, monthly, annualRate: 0.06, years: horizon, annualFee: 0.005 }).value;
  const maxS = Math.max(saved, deposit, invested);

  const groups = [...CPI_GROUPS].sort((a, b) => b.rate - a.rate);
  const top = groups.slice(0, 5);
  const maxRate = Math.max(...top.map((g) => g.rate));

  return (
    <Page>
      <Title lead="Петте най-важни въпроса за личните пари: кредит, заплата, данъци, спестявания и цени. Всички изчисления са с актуалните ставки, а под всеки резултат е написано откъде са числата.">
        Калкулатори
      </Title>

      <div className="grid gap-5 md:grid-cols-2">
        <Card href="/kalkulatori/kredit" kicker="Купувам жилище или кола" title="Колко ще ми струва кредитът" cta="Изчисли своя кредит">
          <p className="text-[15px] mb-3">Ипотека от <b>{eur(loan)}</b> за {years} години при средна лихва <b>{pct(P.mortgageRate.value, 2)}</b>:</p>
          <p className="display num text-[3rem] leading-none mb-3">{eur(pay)} <span className="text-lg font-normal text-muted">на месец</span></p>
          <Bar parts={[{ label: "Връщате заема", value: loan, color: "#1F4D3A" }, { label: "Плащате лихви", value: interest, color: "#C8102E" }]} />
          <p className="text-sm text-muted mt-3">Калкулаторът проверява и дали банката ще ви одобри по правилата на БНБ (вноска до 50% от дохода).</p>
        </Card>

        <Card href="/kalkulatori/danaci" kicker="Заплата" title="Колко от заплатата ми стига до мен" cta="Изчисли своите данъци">
          <p className="text-[15px] mb-3">Бруто заплата <b>{eur(gross)}</b> струва на работодателя <b>{eur(s.laborCost)}</b>. Ето къде отиват парите:</p>
          <Bar parts={[
            { label: "Остава за вас (нето)", value: s.net - vat, color: "#1F4D3A" },
            { label: "Осигуровки (вие и работодателят)", value: s.employeeContrib + s.employerContrib, color: "#b08436" },
            { label: "Данък общ доход", value: s.tax, color: "#3d5a80" },
            { label: "ДДС, ако похарчите 60% от нетото", value: vat, color: "#C8102E" },
          ]} />
        </Card>

        <Card href="/kalkulatori/slozhna-lihva" kicker="Спестявам" title="Под дюшека, на депозит или инвестирани" cta="Сравни своите варианти">
          <p className="text-[15px] mb-3">Ако отделяте <b>{eur(monthly)}</b> на месец в продължение на {horizon} години:</p>
          <ul className="space-y-2.5">
            {[
              ["Под дюшека", saved, "#9aa39e", `реално ще купуват колкото днес ${eur(mattress)}`],
              [`На депозит (${pct(P.depositRate.value, 2)})`, deposit, "#3d5a80", ""],
              ["Инвестирани (6% годишно, 0,5% такса)", invested, "#1F4D3A", "примерна доходност, не е гарантирана"],
            ].map(([l, v, c, n]) => (
              <li key={l as string}>
                <div className="flex justify-between text-sm"><span>{l}</span><b className="num">{eur(v as number)}</b></div>
                <div className="h-2.5 bg-surface rounded-sm mt-1"><div className="h-full rounded-sm" style={{ width: `${((v as number) / maxS) * 100}%`, background: c as string }} /></div>
                {n && <p className="text-xs text-muted mt-0.5">{n}</p>}
              </li>
            ))}
          </ul>
        </Card>

        <Card href="/kalkulatori/lichna-inflaciya" kicker="Цени" title="Моята лична инфлация" cta="Изчисли своята инфлация">
          <p className="text-[15px] mb-3">Официалната инфлация е <b>{pct(P.cpiYoY.value)}</b>, но е средна. Най-много са поскъпнали:</p>
          <ul className="space-y-2">
            {top.map((g) => (
              <li key={g.id} className="grid grid-cols-[1fr_auto] gap-x-3 items-center text-sm">
                <span>{g.label}</span><b className="num">+{g.rate.toLocaleString("bg-BG")}%</b>
                <div className="col-span-2 h-2 bg-surface rounded-sm"><div className="h-full bg-red rounded-sm" style={{ width: `${(g.rate / maxRate) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted mt-3">Ако карате много, а храната е малка част от бюджета ви, вашата инфлация е над официалната.</p>
        </Card>

        <Card href="/kalkulatori/nuzhen-dohod" kicker="Планирам" title="Каква заплата или пенсия ми трябва" cta="Изчисли нужния доход">
          <p className="text-[15px]">Въведете разходите си за жилище, храна, транспорт и спестяване, и калкулаторът ще покаже нужната <b>бруто</b> заплата, след като държавата вземе осигуровките и данъка.</p>
          <p className="text-sm text-muted mt-3">За сравнение: минималната работна заплата е {eur(P.minWage.value, 2)}, а максималният осигурителен доход е {eur(P.maxInsurable.value)}.</p>
        </Card>

        <Card href="/kalkulatori/danaci-razhodi" kicker="Бюджет" title="Данъци срещу разходи" cta="Сравни данък с разходите">
          <p className="text-[15px]">Изберете данък и нова ставка. Инструментът показва колко пари на година е промяната и с колко процента трябва да се намали всеки голям разход в бюджета, за да се получи същата сума.</p>
        </Card>

        <article className="bg-deep text-white rounded-sm p-5">
          <p className="text-sm text-white/70 font-semibold">Ставките, с които смятаме</p>
          <h2 className="display text-[2rem] leading-none mt-1 mb-4">Актуални параметри</h2>
          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-[15px]">
            {[
              ["Лихва по жилищни кредити", pct(P.mortgageRate.value, 2)],
              ["Лихва по потребителски кредити", pct(P.consumerRate.value, 2)],
              ["Лихва по депозити", pct(P.depositRate.value, 2)],
              ["Инфлация (година)", pct(P.cpiYoY.value)],
              ["Минимална заплата", eur(P.minWage.value, 2)],
              ["Макс. осигурителен доход", eur(P.maxInsurable.value)],
              ["Осигуровки на работника", pct(P.employeeRate.value, 2)],
              ["Осигуровки на работодателя", pct(P.employerRate.value, 2)],
              ["Данък общ доход", pct(P.incomeTax.value, 0)],
              ["ДДС", pct(P.vatStd.value, 0)],
            ].flatMap(([k, v]) => [<dt key={k} className="text-white/80">{k}</dt>, <dd key={`${k}v`} className="num font-semibold text-right">{v}</dd>])}
          </dl>
          <p className="text-xs text-white/60 mt-4">Източници: БНБ, НСИ, НАП и законите за 2026 г. Във всеки калкулатор под резултата има връзка към източника и датата.</p>
        </article>
      </div>

      <section className="mt-14 max-w-3xl">
        <SectionTitle>Защо тези калкулатори</SectionTitle>
        <p className="text-[16px]">Решенията на държавата стигат до всеки през тези пет числа: колко струва кредитът, колко остава от заплатата, колко губят спестяванията от инфлацията, колко са поскъпнали нещата, които купувате, и колко трябва да изкарвате. Когато в парламента се гласуват данъци, осигуровки или минимална заплата, тук можете да видите какво значи това точно за вас.</p>
      </section>
    </Page>
  );
}
