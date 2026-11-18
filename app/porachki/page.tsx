import Link from "next/link";
import { placeHref } from "@/lib/regions";
import { Suspense } from "react";
import { PlaceFilterBar } from "@/components/PlaceFilterBar";
import { PlaceProcurement } from "@/components/PlaceProcurement";
import { permanentRedirect } from "next/navigation";
import { ContractList } from "@/components/proc";
import { Page, SectionTitle, Title } from "@/components/ui";
import { OBLASTS, findMunicipality, findOblast, findSettlement } from "@/lib/places";
import { type PlaceFilter, searchContracts } from "@/lib/procurement";

export const metadata = { title: "Обществени поръчки" };

type SP = { q?: string; nivo?: string; oblast?: string; obshtina?: string; mesto?: string };





async function Search({ q }: { q: string }) {
  const items = await searchContracts(q);
  return (
    <section className="mb-12">
      <SectionTitle>Резултати за „{q}“</SectionTitle>
      <ContractList items={items} />
    </section>
  );
}

async function Content({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  // Конкретно място → единната страница на мястото, направо на секцията „Поръчки“.
  if (!sp.nivo) {
    const se = findSettlement(sp.mesto), mu = findMunicipality(sp.obshtina), ob = findOblast(sp.oblast);
    if (se) permanentRedirect(placeHref.settlement(se.code, se.ekatte, "porachki"));
    if (mu) permanentRedirect(placeHref.muni(mu.code, "porachki"));
    if (ob) permanentRedirect(placeHref.oblast(ob.name, "porachki"));
  }
  const f: PlaceFilter = { nivo: sp.nivo, oblast: sp.oblast, obshtina: sp.obshtina, mesto: sp.mesto };
  const ob = findOblast(f.oblast);
  const mu = findMunicipality(f.obshtina);
  return (
    <>
      <div className="bg-surface rounded-sm p-4 mb-8">
        <PlaceFilterBar
          base="/porachki"
          current={f}
          oblasts={OBLASTS.map((o) => ({ value: o.name, label: o.name }))}
          municipalities={(ob?.municipalities ?? []).map((m) => ({ value: m.code, label: m.name }))}
          settlements={(mu ? findOblast(mu.oblast)?.municipalities.find((m) => m.code === mu.code)?.settlements ?? [] : []).map((s) => ({ value: s[0], label: `${s[2] ? "с." : "гр."} ${s[1]}` }))}
        />
        <p className="text-xs text-muted mt-3">
          Изберете област, община или населено място, за да отворите страницата му със всичко на едно място. Държавните институции са в София, дори когато строят другаде. За тях изберете „Ниво: Държавни институции“.
        </p>
      </div>
      <Link href="/porachki/risk" className="block ring-2 ring-red rounded-sm p-4 mb-8 bg-white no-underline text-ink hover:ring-4">
        <p className="font-semibold text-lg">Риск в поръчките за цялата страна →</p>
        <p className="text-[15px] text-muted">Индекс от червени флагове за всеки договор: най-рисковите възложители, фирми, договори и области. <span className="underline">Методология</span>.</p>
      </Link>
      <h2 className="display text-[2.8rem] leading-none mb-5">{mu ? `Община ${mu.name}` : ob ? `Област ${ob.name}` : "Цялата страна"}</h2>
      <PlaceProcurement f={f} />
    </>
  );
}

async function SearchSlot({ searchParams }: { searchParams: Promise<SP> }) {
  const q = ((await searchParams).q ?? "").trim();
  return q ? <Search q={q} /> : null;
}

export default function Porachki({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <Page>
      <Title lead="Кой какво възлага, кой печели, за колко и как се променя цената след подписа. По области, общини и населени места, с източник за всеки договор.">
        Обществени поръчки
      </Title>
      <form action="/porachki" className="flex gap-2 mb-6 max-w-2xl">
        <input name="q" placeholder="Търси поръчка, възложител или ЕИК на фирма" className="flex-1 rounded-sm ring-1 ring-rule px-3 py-2.5 text-[16px] focus:ring-2 focus:ring-green outline-none" />
        <button className="bg-red text-white px-5 rounded-sm font-semibold">Търси</button>
      </form>
      <Suspense fallback={null}><SearchSlot searchParams={searchParams} /></Suspense>
      <Suspense fallback={<p className="text-muted">Зареждане…</p>}><Content searchParams={searchParams} /></Suspense>
      <section className="max-w-3xl text-[15px] mt-6">
        <SectionTitle>Как да четем тези данни</SectionTitle>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Прогнозна стойност</b> е колкото възложителят е очаквал да плати. <b>Договорена</b> е сумата в подписания договор. Реално платената сума може да се различава.</li>
          <li><b>Сигналите</b> (една оферта, голям анекс, връзка с политик) са причина за въпрос, а не доказателство за нарушение.</li>
          <li>Източници: отворените данни на ЦАИС ЕОП (Агенция по обществени поръчки), отчетите на общините в Министерството на финансите и Търговският регистър (обработени от „Наясно“). Местата са по регистъра ЕКАТТЕ.</li>
        </ul>
      </section>
    </Page>
  );
}
