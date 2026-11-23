import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ContractList } from "@/components/proc";
import { Page, SectionTitle, Title } from "@/components/ui";
import { placeData } from "@/lib/place";
import { fmtEur, muniContracts } from "@/lib/procurement";
import { findOblastBySlug, muniSlug, oblastList } from "@/lib/regions";

type P = NonNullable<Awaited<ReturnType<typeof placeData>>>;
export async function generateStaticParams() {
  const ms = oblastList().flatMap((o) => o.municipalities.map((m) => ({ o, m })));
  const ds = await Promise.all(ms.map(({ m }) => placeData(m.code)));
  return ms.flatMap(({ o, m }, i) => (ds[i]?.ipop?.projects ?? []).map((p) => ({ obl: o.slug, muni: muniSlug(m.code), id: p.id })));
}
export async function generateMetadata({ params }: { params: Promise<{ muni: string; id: string }> }) {
  const { id } = await params;
  return { title: `Проект ${decodeURIComponent(id)} – държавна инвестиция в общината` };
}

const STOP = new Set(["изграждане", "реконструкция", "ремонт", "основен", "основно", "рехабилитация", "община", "общ", "обект", "изпълнение", "инженеринг", "проектиране", "съществуваща", "съществуващ", "улица", "улици", "етап", "сграда", "гр", "с", "на", "за", "в", "във", "и", "по", "към", "от", "със", "кв", "упи", "плана", "парцел"]);
/** Отличителните думи в описанието (имена на места и обекти), без общите като „ремонт“ и „изграждане“. */
function keyWords(desc: string, muniName: string) {
  const quoted = [...desc.matchAll(/[„"“]([^„"“”]{3,60})[”"“]/g)].map((m) => m[1].toLowerCase());
  const words = desc.toLowerCase().replace(/[„"“”().,:;–—-]/g, " ").split(/\s+/).filter((w) => w.length >= 5 && !STOP.has(w) && w !== muniName.toLowerCase());
  return { quoted, stems: [...new Set(words.map((w) => (w.length > 7 ? w.slice(0, w.length - 2) : w)))] };
}

async function Related({ code, desc, muniName }: { code: string; desc: string; muniName: string }) {
  await connection();
  const { quoted, stems } = keyWords(desc, muniName);
  const cs = await muniContracts(code, "2020-01-01");
  const scored = cs.map((c) => {
    const t = c.tender_name.toLowerCase();
    const q = quoted.filter((x) => t.includes(x)).length;
    const s = stems.filter((x) => t.includes(x)).length;
    return { c, score: q * 3 + s };
  }).filter((x) => x.score >= Math.min(3, Math.max(2, stems.length - 1)) || x.score >= 3).sort((a, b) => b.score - a.score).slice(0, 10).map((x) => x.c);
  if (!scored.length) return <p className="text-[15px] bg-surface rounded-sm p-4">Не намерихме обществена поръчка на общината с подобен предмет. Възможно е поръчката още да не е обявена или предметът да е описан с други думи.</p>;
  return (<>
    <p className="text-[15px] mb-3 max-w-3xl">Договори на общината, в чийто предмет се срещат същите думи като в описанието на проекта. Връзката е по думи, не по официален номер, затова проверете дали е същият обект.</p>
    <ContractList items={scored} />
    <p className="text-sm text-muted mt-2">Общо {fmtEur(scored.reduce((s, c) => s + (c.contract_value_eur ?? 0), 0))} по тези договори.</p>
  </>);
}

export default async function Investicia({ params }: { params: Promise<{ obl: string; muni: string; id: string }> }) {
  const { obl, muni, id } = await params;
  const o = findOblastBySlug(obl);
  const m = o?.municipalities.find((x) => muniSlug(x.code) === muni);
  const P: P | null = m ? await placeData(m.code) : null;
  const p = P?.ipop?.projects.find((x) => x.id === decodeURIComponent(id));
  if (!o || !m || !P?.ipop || !p) notFound();
  const mn = (v: number) => fmtEur(v);
  const status = p.agreement === 0 ? "Одобрен в програмата, още без споразумение с министерството и без плащания."
    : p.pct === 0 ? "Има подписано споразумение, но още няма плащане. Най-често това значи, че работата още не е започнала, тече обществената поръчка или първото плащане още не е отчетено. Само по себе си не значи, че проектът е спрян."
    : p.pct < 5 ? "Изплатени са под 5% от договорените пари. Обикновено проектът е в началото си; ако е стар, е повод за въпрос към общината."
    : p.pct >= 99 ? "Изплатен е напълно или почти напълно."
    : `Изплатени са ${Math.round(p.pct)}% от договорените пари: проектът е в процес на изпълнение.`;
  return (
    <Page>
      <Title back={{ href: `/mesta/${o.slug}/${muniSlug(m.code)}#pari`, label: `Община ${m.name}` }} kicker={`Държавна инвестиция · ${p.id}`}
        lead={`Инвестиционна програма за общински проекти ${P.ipop.year} г. (пари от държавния бюджет през МРРБ).`}>
        {p.description}
      </Title>
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 mb-8">
        {[["Договорени", p.agreement ? mn(p.agreement) : "–", "по споразумението с МРРБ"], ["Изплатени", mn(p.paid), `${Math.round(p.pct)}% от договорените`],
          ["От държавата", mn(p.state), "платени от МРРБ"], ["От общината", mn(p.muni), "собствено участие"]].map(([a, b, c]) => (
          <div key={a} className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">{a}</p><p className="display text-[2rem]">{b}</p><p className="text-xs text-muted">{c}</p></div>
        ))}
      </section>
      <section className="mb-10">
        <SectionTitle>Докъде е стигнал</SectionTitle>
        <p className="text-[15px] max-w-3xl -mt-2">{status}</p>
        <p className="text-xs text-muted mt-2 max-w-3xl">Плащанията се отчитат със закъснение, затова числата показват кога парите са изплатени, не докъде е стигнала работата на място. За точното състояние: справка от общината или заявление по ЗДОИ.</p>
      </section>
      <section className="mb-10">
        <SectionTitle>Обществени поръчки за обекта</SectionTitle>
        <Suspense fallback={<p className="text-muted">Търсене на поръчките…</p>}><Related code={m.code} desc={p.description} muniName={m.name} /></Suspense>
        <p className="text-sm mt-3"><Link href={`/tarsene?q=${encodeURIComponent(`${m.name} ${keyWords(p.description, m.name).stems.slice(0, 3).join(" ")}`)}`}>Потърсете сами в договорите</Link></p>
      </section>
      <p className="text-xs text-muted">Източник: МРРБ, Инвестиционна програма за общински проекти, обработени от „Наясно“ (github.com/atanasster/electionsbg, MIT).</p>
    </Page>
  );
}
