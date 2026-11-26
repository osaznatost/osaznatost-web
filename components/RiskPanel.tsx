import Link from "next/link";
import { connection } from "next/server";
import { auditsOfMuni } from "@/lib/audits";
import { localData, localIndex, normFirm, personHref } from "@/lib/local";
import {
  PROC_READY, type PlaceFilter, biggestAnnexes, contractRef, contractUrl, firmUrl, fmtEur, placeSuppliersAll, politicalLinks, singleOfferBig,
} from "@/lib/procurement";
import { casesFor, sanctionsFor } from "@/lib/sanctions";

// Червеното каре „Сигнали за риск“ в началото на страницата на област, община и населено място.
// Само правила върху публични данни; всеки сигнал е повод за въпрос, не доказателство. Всяко число води към източника.

type Sig = { level: "high" | "mid"; title: string; body: React.ReactNode };

const since = () => { const d = new Date(); d.setFullYear(d.getFullYear() - 3); return d.toISOString().slice(0, 10); };

export async function RiskPanel({ codes, f, scope }: { codes: string[]; f: PlaceFilter; scope: string }) {
  await connection();
  const sigs: Sig[] = [];
  const IX = await localIndex();
  const locals = (await Promise.all(codes.map((c) => localData(c)))).filter((x): x is NonNullable<typeof x> => !!x);
  const one = codes.length === 1;

  // 1. Санкции, обвинения и присъди на хора от местната власт
  for (const L of locals) for (const o of L.officials) {
    const s = sanctionsFor(o.name), cs = casesFor(o.name);
    if (s || cs.length) sigs.push({ level: "high", title: `${o.name} (${o.roleRaw.toLowerCase()}${one ? "" : `, ${L.name ?? ""}`}): ${s ? "санкции за корупция" : cs[0].levelLabel.toLowerCase()}`, body: <><Link href={personHref(o.slug)}>Профил</Link> · {s ? s.allegation : cs[0].what}</> });
  }

  if (PROC_READY) {
    const [sup, single, annexes] = await Promise.all([
      one ? placeSuppliersAll(codes[0]).catch(() => []) : Promise.resolve([] as Awaited<ReturnType<typeof placeSuppliersAll>>),
      singleOfferBig(since(), f).catch(() => []),
      biggestAnnexes(since(), f).catch(() => []),
    ]);
    // 2. Конфликт на интереси: фирма от декларацията на длъжностно лице печели поръчки в общината (съвпадение по име)
    if (one && sup.length) {
      const byNorm = new Map(sup.map((s) => [normFirm(s.name), s]));
      for (const L of locals) for (const o of L.officials) for (const st of o.decl?.stakes ?? []) {
        const s = byNorm.get(normFirm(st.company));
        if (s) sigs.push({ level: "high", title: `${o.name} (${o.roleRaw.toLowerCase()}) има дял във фирма, която печели поръчки тук`, body: <><Link href={firmUrl(s.eik)}>{s.name}</Link>: {s.contracts} договора за {fmtEur(s.total_eur)}. Съвпадение по име (декларациите са без ЕИК). <Link href={personHref(o.slug)}>Профил</Link></> });
      }
    }
    // 3. Изпълнители, свързани с политици (Търговски регистър)
    if (one && sup.length) {
      const linked = sup.map((s) => ({ s, l: politicalLinks(s.eik) })).filter((x) => x.l.length).slice(0, 6);
      if (linked.length) sigs.push({ level: "mid", title: `${linked.length} изпълнител${linked.length > 1 ? "и" : ""} на поръчки тук, свързан${linked.length > 1 ? "и" : ""} с политици`, body: <ul className="mt-1 space-y-0.5">{linked.map(({ s, l }) => <li key={s.eik}><Link href={firmUrl(s.eik)}>{s.name}</Link> ({fmtEur(s.total_eur)}) – {l.slice(0, 2).map((x) => `${x.who}${x.party ? `, ${x.party}` : x.position ? `, ${x.position}` : ""}`).join("; ")}</li>)}</ul> });
    }
    // 4. Големи договори само с една оферта
    const big1 = single.filter((c) => (c.contract_value_eur ?? 0) >= 100000).slice(0, 5);
    if (big1.length) sigs.push({ level: big1.length >= 3 ? "high" : "mid", title: `${single.length >= 20 ? "20+" : single.length} договора с една-единствена оферта за последните 3 години`, body: <ul className="mt-1 space-y-0.5">{big1.map((c) => <li key={c.id}><Link href={contractUrl(c.id)}>{c.tender_name.slice(0, 110)}</Link> – {fmtEur(c.contract_value_eur)}, {c.supplier_names.join(", ")}</li>)}</ul> });
    // 5. Оскъпяване с анекси
    const up = annexes.filter((a) => a.last_value_eur && a.value_difference_eur && a.value_difference_eur / a.last_value_eur >= 0.1).slice(0, 5);
    if (up.length) sigs.push({ level: up.some((a) => a.value_difference_eur! / a.last_value_eur! >= 0.3) ? "high" : "mid", title: `${up.length} договора, оскъпени с анекс с над 10%`, body: <ul className="mt-1 space-y-0.5">{up.map((a) => <li key={a.id}><Link href={contractUrl(contractRef(a.buyer_eik, a.contract_number))}>{a.tender_name.slice(0, 110)}</Link> – +{fmtEur(a.value_difference_eur)} ({Math.round((100 * a.value_difference_eur!) / a.last_value_eur!)}%), {a.supplier_names.join(", ")}</li>)}</ul> });
  }

  // 6. Одити на Сметната палата и АДФИ, в които се споменава общината
  const audits = (await Promise.all(codes.map((c) => auditsOfMuni(c).catch(() => [])))).flat();
  if (audits.length) sigs.push({ level: "mid", title: `${audits.length} одитни доклада за ${one ? "общината" : "общини в областта"}`, body: <ul className="mt-1 space-y-0.5">{audits.slice(0, 4).map((a) => <li key={a.id}><a href={a.url} target="_blank" rel="noreferrer">{a.title.slice(0, 120)}</a> ({a.year})</li>)}</ul> });

  // 7. Решения на съвета, приети с гласове „против“
  const contested = codes.reduce((s, c) => s + (IX.munis[c]?.contested ?? 0), 0);
  if (contested) sigs.push({ level: "mid", title: `${contested} решения на общинск${one ? "ия съвет" : "ите съвети"}, приети с гласове „против“`, body: <>Спорните решения са първи в {one ? <Link href="#vlast">„Местна власт“</Link> : "страницата на всяка община"}.</> });

  const high = sigs.filter((s) => s.level === "high").length;
  return (
    <section className="ring-2 ring-red rounded-sm bg-white p-4 md:p-5 mb-12">
      <p className="text-sm font-semibold text-red">Сигнали за риск · {scope}</p>
      <h2 className="display text-[1.6rem] leading-tight mb-1">{sigs.length ? `${sigs.length} сигнала${high ? `, ${high} сериозни` : ""}` : "Няма автоматично открити сигнали"}</h2>
      <p className="text-sm text-muted mb-3 max-w-3xl">Свързани лица и фирми, конфликт на интереси, поръчки с една оферта, оскъпяване с анекси, одити, санкции и присъди. Сигналът е повод за въпрос, не доказателство за нарушение. <Link href="/metodologiya">Как ги откриваме</Link></p>
      {sigs.length > 0 && (
        <ul className="space-y-3">{[...sigs.filter((s) => s.level === "high"), ...sigs.filter((s) => s.level !== "high")].map((s, i) => (
          <li key={i} className={`border-l-4 pl-3 text-[15px] ${s.level === "high" ? "border-red" : "border-[#e08a2e]"}`}>
            <p className="font-semibold">{s.title}</p>
            <div className="text-[15px]">{s.body}</div>
          </li>
        ))}</ul>
      )}
    </section>
  );
}
