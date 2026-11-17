import Link from "next/link";
import { Suspense } from "react";
import { AnnexList, ContractList, NOT_READY } from "@/components/proc";
import { Page, SectionTitle, Title } from "@/components/ui";
import {
  PROC_READY, biggestAnnexes, biggestContracts, firmUrl, fmtDate, fmtEur, importState, latestContracts, politicalLinks,
  searchContracts, singleOfferBig, topSuppliers,
} from "@/lib/procurement";

export const metadata = { title: "Обществени поръчки" };

const minus = (d: string, days: number) => new Date(Date.parse(d) - days * 864e5).toISOString().slice(0, 10);

async function Search({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim();
  if (!q) return null;
  const items = await searchContracts(q);
  return (
    <section className="mb-12">
      <SectionTitle>Резултати за „{q}“</SectionTitle>
      <ContractList items={items} />
    </section>
  );
}

async function Overview() {
  const last = await importState();
  if (!PROC_READY || !last) return NOT_READY;
  const since = minus(last, 90);
  const [annexes, single, big, top, latest] = await Promise.all([
    biggestAnnexes(since), singleOfferBig(since), biggestContracts(since), topSuppliers(), latestContracts(),
  ]);
  return (
    <>
      <p className="text-sm text-muted mb-8">Данните са до {fmtDate(last)} и се обновяват на всеки 3 часа. „Последните 90 дни“ означава от {fmtDate(since)}.</p>

      <section className="mb-14">
        <SectionTitle>Най-голямо оскъпяване с анекси, последните 90 дни</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Анексът променя договора след подписването му. Голямото оскъпяване не е непременно нарушение, но заслужава въпрос: защо цената не е била ясна при търга?</p>
        <AnnexList items={annexes} />
      </section>

      <section className="mb-14">
        <SectionTitle>Големи договори само с една оферта</SectionTitle>
        <p className="text-[15px] text-muted -mt-3 mb-4 max-w-3xl">Когато участва само един кандидат, няма с кого да се сравни цената. Причината може да е тясна специализация, кратък срок или условия, написани за конкретна фирма.</p>
        <ContractList items={single} />
      </section>

      <section className="mb-14">
        <SectionTitle>Най-големите договори, последните 90 дни</SectionTitle>
        <ContractList items={big} />
      </section>

      <section className="mb-14">
        <SectionTitle>Изпълнители с най-голяма сума в базата</SectionTitle>
        <ul className="divide-y divide-rule border-y border-rule text-[15px]">
          {top.map((s) => (
            <li key={s.eik} className="py-2 grid grid-cols-[1fr_auto] gap-3">
              <span className="truncate"><Link href={firmUrl(s.eik)}>{s.name}</Link>{politicalLinks(s.eik).length > 0 && <span className="text-red font-bold" title="Връзка с политик по Търговския регистър"> ●</span>}</span>
              <span className="num whitespace-nowrap">{s.contracts} дог. · {fmtEur(s.total_eur)}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted mt-2">● Фирмата има връзка с депутат или длъжностно лице по Търговския регистър (по данни на „Наясно“).</p>
      </section>

      <section className="mb-14">
        <SectionTitle>Последно публикувани договори</SectionTitle>
        <ContractList items={latest} />
      </section>
    </>
  );
}

export default function Porachki({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <Page>
      <Title lead="Кой какво възлага, кой печели, за колко и как се променя цената след подписа. Всеки договор с източник от регистъра на обществените поръчки.">
        Обществени поръчки
      </Title>
      <form action="/porachki" className="flex gap-2 mb-10 max-w-2xl">
        <input name="q" placeholder="Търси община, поръчка или ЕИК на фирма" className="flex-1 rounded-sm ring-1 ring-rule px-3 py-2.5 text-[16px] focus:ring-2 focus:ring-green outline-none" />
        <button className="bg-red text-white px-5 rounded-sm font-semibold">Търси</button>
      </form>
      <Suspense fallback={null}><Search searchParams={searchParams} /></Suspense>
      <Suspense fallback={<p className="text-muted">Зареждане…</p>}><Overview /></Suspense>
      <section className="max-w-3xl text-[15px] mt-6">
        <SectionTitle>Как да четем тези данни</SectionTitle>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Прогнозна стойност</b> е колкото възложителят е очаквал да плати. <b>Договорена</b> е сумата в подписания договор. Реално платената сума може да се различава.</li>
          <li><b>Сигналите</b> (една оферта, голям анекс, връзка с политик) са причина за въпрос, а не доказателство за нарушение.</li>
          <li>Източник: отворените данни на ЦАИС ЕОП на Агенцията по обществени поръчки. Политическите връзки са по Търговския регистър, обработени от „Наясно“.</li>
        </ul>
      </section>
    </Page>
  );
}
