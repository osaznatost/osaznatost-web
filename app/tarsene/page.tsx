import Link from "next/link";
import { Suspense } from "react";
import { MultiLine } from "@/components/Charts";
import { Page, SectionTitle, Title } from "@/components/ui";
import { contractUrl, firmUrl, buyerUrl, fmtDate, fmtEur, rawQuery, type Contract } from "@/lib/procurement";
import { parse, toQuery } from "@/lib/search";

export const metadata = { title: "Търсене в обществените поръчки" };

const EXAMPLES = ["асфалт Ботевград 2024", "колко е платила Варна за храна 2023-2025", "една оферта горива Софийска област", "„Пътстрой-92“", "без конкурс компютри под 50 000", "с. Трудовец ремонт", "училище покрив над 100 хил. Пловдив", "снегопочистване Смолян"];

async function Results({ sp }: { sp: Promise<{ q?: string }> }) {
  const q = ((await sp).q ?? "").trim().slice(0, 200);
  if (!q) return <Examples />;
  const p = parse(q);
  const firmEiks = p.firm ? (await rawQuery<{ eik: string }>(`proc_supplier_stats?name=ilike.${encodeURIComponent(`*${p.firm.replace(/[*,()]/g, " ")}*`)}&select=eik&limit=30`)).map((x) => x.eik) : [];
  const nothing = !p.muni && !p.oblast && !p.topic && !p.words.length && !p.firm && !p.eik && !p.village;
  if (nothing) return <><p className="text-[15px] bg-surface rounded-sm p-4 mb-6">Не разпознахме община, тема, фирма или дума за търсене в „{q}“. Опитайте като в примерите.</p><Examples /></>;
  const rows = await rawQuery<Contract & { municipality: string | null; oblast: string | null }>(toQuery(p, firmEiks));
  const total = rows.reduce((s, c) => s + (c.contract_value_eur ?? 0), 0);
  const single = rows.filter((c) => c.offers_count === 1).length;
  const by = <K extends string>(key: (c: Contract) => [K, string][]) => {
    const m = new Map<K, { name: string; n: number; v: number }>();
    for (const c of rows) for (const [k, name] of key(c)) { const x = m.get(k) ?? { name, n: 0, v: 0 }; x.n++; x.v += (c.contract_value_eur ?? 0) / Math.max(1, key(c).length); m.set(k, x); }
    return [...m.entries()].sort((a, b) => b[1].v - a[1].v);
  };
  const sup = by((c) => c.supplier_eiks.map((e, i) => [e, c.supplier_names[i] ?? e] as [string, string]));
  const buy = by((c) => [[c.buyer_eik, c.buyer_name]]);
  const years = by((c) => (c.contract_date ? [[c.contract_date.slice(0, 4), c.contract_date.slice(0, 4)]] : []));
  return (
    <>
      <p className="text-[15px] mb-6"><b>Разбрахме:</b> {p.understood.join(" · ") || "–"}.{p.firm && !firmEiks.length ? " Не намерихме изпълнител с такова име; търсим само сред възложителите." : ""}</p>
      {!rows.length ? <p className="text-[15px] bg-surface rounded-sm p-4">Няма договори по тези условия в базата (основно 2022–2026 г.). Опитайте с по-малко думи или друга година.</p> : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
            {[["Договори", `${rows.length >= 1000 ? "над " : ""}${rows.length.toLocaleString("bg-BG")}`, rows.length >= 1000 ? "показваме първите 1000 по стойност" : "по разбраните условия"], ["Обща стойност", fmtEur(total), "по договорите, без анексите"],
              ["С една оферта", `${Math.round((single / rows.length) * 100)}%`, `${single} договора`], ["Най-голям изпълнител", sup[0] ? `${Math.round((sup[0][1].v / Math.max(1, total)) * 100)}%` : "–", sup[0]?.[1].name ?? ""]]
              .map(([l, v, n]) => <div key={l} className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">{l}</p><p className="display num text-[2rem] mt-1">{v}</p><p className="text-xs text-muted">{n}</p></div>)}
          </section>
          <section className="grid gap-8 lg:grid-cols-3 mb-10">
            <div><SectionTitle>Кой взима</SectionTitle><ul className="space-y-1 text-[15px]">{sup.slice(0, 10).map(([e, x]) => <li key={e} className="flex justify-between gap-2"><Link href={firmUrl(e)}>{x.name}</Link><span className="num whitespace-nowrap text-sm">{fmtEur(x.v)} · {x.n}</span></li>)}</ul></div>
            <div><SectionTitle>Кой плаща</SectionTitle><ul className="space-y-1 text-[15px]">{buy.slice(0, 10).map(([e, x]) => <li key={e} className="flex justify-between gap-2"><Link href={buyerUrl(e)}>{x.name}</Link><span className="num whitespace-nowrap text-sm">{fmtEur(x.v)} · {x.n}</span></li>)}</ul></div>
            <div><SectionTitle>По години</SectionTitle>{years.length > 1 ? <MultiLine data={years.map(([y, x]) => ({ series: "Стойност", x: Number(y), value: Math.round(x.v) }))} unit=" €" height={220} /> : <p className="text-[15px]">{years.map(([y, x]) => `${y}: ${fmtEur(x.v)}`).join("; ")}</p>}</div>
          </section>
          <SectionTitle>Договорите (най-големите първо)</SectionTitle>
          <ul className="divide-y divide-rule border-y border-rule text-[15px]">{rows.slice(0, 150).map((c) => (
            <li key={c.id} className="py-2 grid sm:grid-cols-[1fr_auto] gap-x-4">
              <span><Link href={contractUrl(c.id)}>{c.tender_name.replace(/^[„"]|[“"]$/g, "").slice(0, 200)}</Link>
                <span className="block text-sm text-muted">{fmtDate(c.contract_date)} · {c.buyer_name} → {c.supplier_names.join(", ")}{c.offers_count === 1 ? " · една оферта" : ""}{c.municipality ? ` · ${c.municipality}` : ""}</span></span>
              <span className="num font-semibold">{fmtEur(c.contract_value_eur)}</span>
            </li>
          ))}</ul>
        </>
      )}
    </>
  );
}

function Examples() {
  return (
    <section className="mb-10">
      <p className="text-[15px] mb-3">Пишете както бихте попитали човек. Разпознаваме община, село или област, година или период, тема (асфалт, храна, горива, ток, сгради…), сума („над 100 хил.“, „под 50 000“), сигнал („една оферта“, „без конкурс“, „европейски“) и фирма в кавички.</p>
      <ul className="flex flex-wrap gap-2">{EXAMPLES.map((e) => <li key={e}><Link href={`/tarsene?q=${encodeURIComponent(e)}`} className="block px-3 py-1.5 rounded-full bg-surface no-underline text-ink hover:ring-1 hover:ring-green text-[15px]">{e}</Link></li>)}</ul>
    </section>
  );
}

async function Box({ sp }: { sp: Promise<{ q?: string }> }) {
  const q = (await sp).q ?? "";
  return (
    <form action="/tarsene" className="flex gap-2 mb-6 max-w-3xl">
      <input name="q" defaultValue={q} placeholder="напр. колко е платил Ботевград за асфалт през 2024" className="flex-1 rounded-md ring-1 ring-rule px-4 py-3 text-[16px] bg-white focus:outline-none focus:ring-2 focus:ring-green" />
      <button className="bg-green text-white font-semibold px-5 rounded-md">Търси</button>
    </form>
  );
}

export default function Tarsene({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <Page>
      <Title kicker="Обществени поръчки" lead="Къде отиват парите, при кои фирми и колко. Без изкуствен интелект: заявката се разделя на думи, които стават филтри, и винаги виждате какво точно сме разбрали.">Търсене</Title>
      <Suspense fallback={null}><Box sp={searchParams} /></Suspense>
      <Suspense fallback={<p className="text-muted">Търсене…</p>}><Results sp={searchParams} /></Suspense>
      <p className="text-xs text-muted mt-8">Данни: ЦАИС ЕОП (договори от 2022 г. насам; по-старите са непълни). Сумите са по договорите, без анексите. <Link href="/porachki/metodologiya">Как работи анализът</Link>.</p>
    </Page>
  );
}
