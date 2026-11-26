import Link from "next/link";
import { connection } from "next/server";
import { auditsOfMuni } from "@/lib/audits";
import { localData, localIndex, normFirm, personHref } from "@/lib/local";
import {
  PROC_READY, type PlaceFilter, biggestAnnexes, contractRef, contractUrl, firmUrl, fmtEur, muniContracts, placeSuppliersAll, politicalLinks, singleOfferBig, supplierStats,
} from "@/lib/procurement";
import { casesFor, sanctionsFor } from "@/lib/sanctions";
import { data } from "@/lib/data";
import { foundedDate, sharedPeople, trMany } from "@/lib/tr";
import { MPS, partyName } from "@/lib/parliament";

type TrHit = { s: string; k: "own" | "partner"; how?: string; now?: boolean; partner?: string; via?: string[]; roles?: string[] };
type TrIndex = { people: Record<string, [string, string, string]>; byEik: Record<string, TrHit[]> };
const tc = (s: string) => s.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());

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
    // 2–3. Свързани лица по Търговския регистър (с историята): фирми на длъжностните лица и на техните
    // настоящи и бивши съдружници, които печелят поръчки тук; плюс декларациите и връзките с депутати.
    const sups = one ? sup : (await Promise.all(codes.map((c) => placeSuppliersAll(c).catch(() => [])))).flat();
    if (sups.length) {
      const TR = (await data<TrIndex>("tr-links/eik-index.json")) ?? { people: {}, byEik: {} };
      const local = new Map<string, { name: string; role: string; code: string; own: React.ReactNode[]; partner: React.ReactNode[]; total: number }>();
      const other = new Map<string, { who: string; items: React.ReactNode[] }>();
      const seen = new Set<string>();
      for (const sp of sups) {
        if (seen.has(sp.eik)) continue; seen.add(sp.eik);
        for (const h of TR.byEik[sp.eik.slice(0, 9)] ?? []) {
          const [pc, pn, pr] = TR.people[h.s] ?? ["", h.s, ""];
          const firm = <Link href={firmUrl(sp.eik)}>{sp.name}</Link>;
          if (codes.includes(pc)) {
            const x = local.get(h.s) ?? { name: pn, role: pr, code: pc, own: [], partner: [], total: 0 };
            if (h.k === "own") x.own.push(<li key={`o${sp.eik}`}>{firm}: {sp.contracts} договора за {fmtEur(sp.total_eur)} · <b>{h.now ? "негова/нейна фирма" : "бивша негова/нейна фирма"}</b> ({h.how})</li>);
            else x.partner.push(<li key={`p${sp.eik}`}>{firm}: {sp.contracts} договора за {fmtEur(sp.total_eur)} · фирма на <b>{tc(h.partner ?? "")}</b>{h.roles?.length ? ` (${h.roles.join(", ")})` : ""}, бивш или настоящ съдружник/управител заедно с {pn.split(" ")[0]}{h.via?.length ? ` в ${h.via.join(", ")}` : ""}</li>);
            x.total += sp.total_eur ?? 0;
            local.set(h.s, x);
          } else {
            const mp = pc === "MP" ? MPS.find((m) => `mp-${m.id}` === h.s) : null; // „GOV“: министри и заместник-министри
            const who = `${pn} (${mp ? `депутат, ${partyName(mp.party)}` : pc === "GOV" ? pr.toLowerCase() : `${pr.toLowerCase()}, ${IX.munis[pc]?.name ?? pc}`})`;
            const y = other.get(h.s) ?? { who, items: [] };
            y.items.push(<li key={sp.eik}>{firm} ({fmtEur(sp.total_eur)}) – {h.k === "own" ? (h.now ? "негова/нейна фирма" : "бивша негова/нейна фирма") : `фирма на съдружника му/ѝ ${tc(h.partner ?? "")}`}</li>);
            other.set(h.s, y);
          }
        }
      }
      for (const [slug, x] of local) sigs.push({
        level: x.own.length || x.total >= 50000 ? "high" : "mid",
        title: `${x.name} (${x.role.toLowerCase()}${one ? "" : `, ${IX.munis[x.code]?.name ?? ""}`}): ${x.own.length + x.partner.length} свързани фирми печелят поръчки тук за ${fmtEur(x.total)}`,
        body: <><ul className="mt-1 space-y-0.5">{[...x.own, ...x.partner].slice(0, 8)}</ul><p className="text-sm mt-1"><Link href={personHref(slug)}>Всички връзки и схемата</Link> · по Търговския регистър, с историята; по три имена, без ЕГН</p></>,
      });
      // декларирани дялове, които не са хванати от регистъра (съвпадение по име)
      const byNorm = new Map(sups.map((x) => [normFirm(x.name), x]));
      for (const L of locals) for (const o of L.officials) for (const st of o.decl?.stakes ?? []) {
        const x = byNorm.get(normFirm(st.company));
        if (x && !(TR.byEik[x.eik.slice(0, 9)] ?? []).some((h) => h.s === o.slug)) sigs.push({ level: "high", title: `${o.name} (${o.roleRaw.toLowerCase()}) е декларирал дял във фирма, която печели поръчки тук`, body: <><Link href={firmUrl(x.eik)}>{x.name}</Link>: {x.contracts} договора за {fmtEur(x.total_eur)}. <Link href={personHref(o.slug)}>Профил</Link></> });
      }
      const others = [...other.values()];
      const nay = [...seen].map((e) => ({ s: sups.find((x) => x.eik === e)!, l: politicalLinks(e) })).filter((x) => x.l.length);
      if (others.length || nay.length) sigs.push({ level: "mid", title: `Изпълнители на поръчки тук, свързани с депутати и други политици (${others.length + nay.length})`, body: (
        <ul className="mt-1 space-y-1">
          {others.slice(0, 8).map((o) => <li key={o.who}><b>{o.who}</b><ul className="ml-4">{o.items.slice(0, 4)}</ul></li>)}
          {nay.slice(0, 6).map(({ s, l }) => <li key={s.eik}><Link href={firmUrl(s.eik)}>{s.name}</Link> ({fmtEur(s.total_eur)}) – {l.slice(0, 2).map((x) => `${x.who}${x.party ? `, ${x.party}` : x.position ? `, ${x.position}` : ""}`).join("; ")}</li>)}
        </ul>
      ) });
    }
    // Нови фирми, зависимост от един възложител, концентрация и фирми с общи хора (симулирана конкуренция).
    if (one && sups.length) {
      const top = [...sups].sort((a, b) => (b.total_eur ?? 0) - (a.total_eur ?? 0)).slice(0, 40);
      const T = sups.reduce((a, x) => a + (x.total_eur ?? 0), 0);
      const lead = top[0];
      if (lead && T >= 1e6 && (lead.total_eur ?? 0) / T >= 0.2) sigs.push({ level: (lead.total_eur ?? 0) / T >= 0.35 ? "high" : "mid", title: `Една фирма взима ${Math.round((100 * (lead.total_eur ?? 0)) / T)}% от парите по поръчките тук`, body: <><Link href={firmUrl(lead.eik)}>{lead.name}</Link>: {lead.contracts} договора за {fmtEur(lead.total_eur)} от общо {fmtEur(T)}. Силната концентрация при един изпълнител е рисков фактор по методиката на ЕК.</> });
      const [stats, tr, mc, shared] = await Promise.all([
        Promise.all(top.slice(0, 25).map((x) => supplierStats(x.eik).catch(() => null))),
        trMany(top.map((x) => x.eik)),
        muniContracts(codes[0], since()).catch(() => []),
        sharedPeople(top.map((x) => x.eik)).catch(() => []),
      ]);
      const dep = top.slice(0, 25).map((x, i) => ({ x, st: stats[i] })).filter(({ x, st }) => st && (st.total_eur ?? 0) >= 100000 && (x.total_eur ?? 0) / (st.total_eur ?? 1) >= 0.8);
      if (dep.length) sigs.push({ level: "mid", title: `${dep.length} фирм${dep.length > 1 ? "и" : "а"} живе${dep.length > 1 ? "ят" : "е"} почти само от поръчките на тази община`, body: <ul className="mt-1 space-y-0.5">{dep.slice(0, 6).map(({ x, st }) => <li key={x.eik}><Link href={firmUrl(x.eik)}>{x.name}</Link> – {Math.round((100 * (x.total_eur ?? 0)) / (st!.total_eur ?? 1))}% от всичките ѝ поръчки ({fmtEur(x.total_eur)} от {fmtEur(st!.total_eur)})</li>)}</ul> });
      const young = new Map<string, { name: string; founded: string; first: string; v: number }>();
      for (const c of mc) for (const e of c.supplier_eiks) {
        const fd = foundedDate(tr.get(e.slice(0, 9)) ?? null);
        if (!fd || !c.contract_date || (c.contract_value_eur ?? 0) < 30000) continue;
        const gap = Date.parse(c.contract_date) - Date.parse(fd);
        if (gap >= 0 && gap < 365 * 864e5) { const y = young.get(e) ?? { name: c.supplier_names[c.supplier_eiks.indexOf(e)] ?? e, founded: fd, first: c.contract_date, v: 0 }; y.v += c.contract_value_eur ?? 0; if (c.contract_date < y.first) y.first = c.contract_date; young.set(e, y); }
      }
      if (young.size) sigs.push({ level: [...young.values()].some((y) => y.v >= 200000) ? "high" : "mid", title: `${young.size} нов${young.size > 1 ? "и фирми" : "а фирма"}: договор до година след създаването`, body: <ul className="mt-1 space-y-0.5">{[...young.entries()].sort((a, b) => b[1].v - a[1].v).slice(0, 6).map(([e, y]) => <li key={e}><Link href={firmUrl(e)}>{y.name}</Link> – създадена {y.founded.endsWith("-01-01") ? y.founded.slice(0, 4) : y.founded.split("-").reverse().join(".")}, първи договор тук {y.first.split("-").reverse().join(".")}, общо {fmtEur(y.v)}</li>)}</ul> });
      if (shared.length) sigs.push({ level: "mid", title: `${shared.length} души са управители или собственици в повече от една фирма, които печелят поръчки тук`, body: <><ul className="mt-1 space-y-0.5">{shared.slice(0, 6).map((x) => <li key={x.name}><b>{tc(x.name)}</b>: {x.firms.map((e) => top.find((t) => t.eik.slice(0, 9) === e)?.name ?? e).join(", ")}</li>)}</ul><p className="text-sm mt-1 text-muted">Ако тези фирми участват в едни и същи търгове, конкуренцията може да е привидна.</p></> });
    }

    // 4. Големи договори само с една оферта
    const big1 = single.filter((c) => (c.contract_value_eur ?? 0) >= 100000).slice(0, 5);
    if (big1.length) sigs.push({ level: big1.length >= 3 ? "high" : "mid", title: `${single.length >= 20 ? "20+" : single.length} договора с една-единствена оферта за последните 3 години`, body: <ul className="mt-1 space-y-0.5">{big1.map((c) => <li key={c.id}><Link href={contractUrl(c.id)}>{c.tender_name.slice(0, 110)}</Link> – {fmtEur(c.contract_value_eur)}, {c.supplier_names.join(", ")}</li>)}</ul> });
    // 5. Оскъпяване с анекси
    const up = annexes.filter((a) => a.last_value_eur && a.value_difference_eur && a.value_difference_eur / a.last_value_eur >= 0.1).slice(0, 5);
    if (up.length) sigs.push({ level: up.some((a) => a.value_difference_eur! / a.last_value_eur! >= 0.3) ? "high" : "mid", title: `${up.length} договора, оскъпени с анекс с над 10%`, body: <ul className="mt-1 space-y-0.5">{up.map((a) => <li key={a.id}><Link href={contractUrl(contractRef(a.buyer_eik, a.contract_number))}>{a.tender_name.slice(0, 110)}</Link> – +{fmtEur(a.value_difference_eur)} ({Math.round((100 * a.value_difference_eur!) / a.last_value_eur!)}%), {a.supplier_names.join(", ")}</li>)}</ul> });
  }

  // Бързо забогатяване: пари в банки и вземания минус задълженията растат много повече от декларирания доход.
  for (const L of locals) for (const o of L.officials) {
    const H = [...(o.history ?? [])].sort((a, b) => a.year - b.year);
    for (let i = 1; i < H.length; i++) {
      const w = (h: typeof H[number]) => h.bankEur + h.receivableEur - h.debtEur;
      const d = w(H[i]) - w(H[i - 1]), inc = H[i].income + H[i].incomeSpouse;
      if (d >= 50000 && d > 2 * Math.max(inc, 1)) { sigs.push({ level: d >= 150000 ? "high" : "mid", title: `${o.name} (${o.roleRaw.toLowerCase()}${one ? "" : `, ${L.name ?? ""}`}): имуществото расте повече от доходите`, body: <>За {H[i].fiscalYear ?? H[i].year - 1} г. парите в банки и вземанията минус задълженията растат с {fmtEur(d)}, а декларираният доход (със съпруг/а) е {fmtEur(inc)}. Може да има законно обяснение (наследство, продажба на имот). <Link href={personHref(o.slug)}>Декларациите</Link></> }); break; }
    }
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
      <p className="text-sm text-muted mb-3 max-w-3xl">Свързани лица и фирми по Търговския регистър (и бивши съдружници), конфликт на интереси, поръчки с една оферта, оскъпяване с анекси, одити, санкции и присъди. Сигналът е повод за въпрос, не доказателство за нарушение. <Link href="/metodologiya">Как ги откриваме</Link></p>
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
