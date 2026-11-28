import { connection } from "next/server";
// Обществените поръчки на едно място (страна, област, община, град или село). Ползва се от страницата на мястото
// и от „Поръчки“, за да е една и съща информация навсякъде.
import Link from "next/link";
import { AnnexList, ContractList, NOT_READY } from "@/components/proc";
import { findMunicipality, findOblast, findSettlement } from "@/lib/places";
import {
  PROC_READY, type PlaceFilter, type PlaceStat, biggestAnnexes, biggestContracts, firmUrl, fmtDate, fmtEur, importState, latestContracts,
  placeMunicipalities, placeMunicipality, placeOblast, placeOblasts, placeSettlement, placeSettlements, placeSuppliers, singleOfferBig,
} from "@/lib/procurement";
import { placeHref } from "@/lib/regions";
import { linkMap } from "@/lib/redFlags";
import { firmSigMany } from "@/lib/firmSignals";
import { SigBadge } from "@/components/SigBadge";

const minus = (d: string, days: number) => new Date(Date.parse(d) - days * 864e5).toISOString().slice(0, 10);
export const pctOf = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

export function Kpis({ items }: { items: [string, string, string?][] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map(([l, v, n]) => (
        <div key={l} className="bg-surface rounded-sm p-4">
          <p className="text-sm text-muted">{l}</p>
          <p className="display num text-[1.75rem] sm:text-[2.3rem] mt-1 leading-none break-words">{v}</p>
          {n && <p className="text-sm mt-1">{n}</p>}
        </div>
      ))}
    </div>
  );
}

function BreakdownTable({ rows, label, link }: { rows: PlaceStat[]; label: (r: PlaceStat) => string; link: (r: PlaceStat) => string }) {
  if (!rows.length) return <p className="text-muted text-[15px]">Няма данни.</p>;
  const max = Math.max(...rows.map((r) => r.total_eur ?? 0));
  return (
    <ul className="divide-y divide-rule border-y border-rule text-[15px]">
      {rows.map((r) => (
        <li key={label(r)} className="py-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 items-center">
          <Link href={link(r)} className="truncate font-semibold">{label(r)}</Link>
          <span className="num whitespace-nowrap text-right">{fmtEur(r.total_eur)}</span>
          <div className="col-span-2 mt-1 flex items-center gap-3">
            <div className="h-1.5 bg-surface rounded-full flex-1 overflow-hidden"><div className="h-full bg-green" style={{ width: `${((r.total_eur ?? 0) / (max || 1)) * 100}%` }} /></div>
            <span className="text-xs text-muted whitespace-nowrap">{r.contracts} дог. · една оферта: <span className={r.single_offer / r.contracts > 0.3 ? "text-red font-semibold" : ""}>{pctOf(r.single_offer, r.contracts)}</span></span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Списък, който показва първите няколко и разгъва останалите на същото място. */
function More({ title, children, open }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="mb-6 group" open={open}>
      <summary className="cursor-pointer font-semibold text-lg py-2 list-none flex items-center gap-2"><span className="text-green group-open:rotate-90 transition-transform">›</span>{title}</summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}

export async function PlaceProcurement({ f, showBreakdown = true }: { f: PlaceFilter; showBreakdown?: boolean }) {
  await connection(); // при отваряне, не при сглобяване: иначе сборката тегли хиляди заявки към базата
  const ob = findOblast(f.oblast), mu = findMunicipality(f.obshtina), se = findSettlement(f.mesto);
  const last = await importState();
  if (!PROC_READY || !last) return NOT_READY;
  const since = minus(last, 90);
  const [stat, breakdown, suppliers, annexes, single, big, latest] = await Promise.all([
    se ? placeSettlement(se.ekatte) : mu ? placeMunicipality(mu.code) : ob ? placeOblast(ob.name) : Promise.resolve(undefined),
    se ? Promise.resolve([]) : mu ? placeSettlements(mu.code) : ob ? placeMunicipalities(ob.name) : placeOblasts(),
    mu && !se ? placeSuppliers(mu.code) : Promise.resolve([]),
    biggestAnnexes(since, f), singleOfferBig(since, f), biggestContracts(since, f), latestContracts(f),
  ]);
  const [lk, sg] = await Promise.all([linkMap(suppliers.map((s) => s.eik)), firmSigMany(suppliers.map((s) => s.eik)).catch(() => new Map())]);
  return (
    <>
      <p className="text-sm text-muted mb-4">{mu && !se ? <><a href={`/rss/obshtina/${mu.code}`} className="font-semibold">Абонирайте се за новите поръчки (RSS)</a> · </> : null}Договорите на възложители със седалище тук (общината, училищата, болниците, дружествата и др.). Данните са до {fmtDate(last)}, обновяват се на всеки 3 часа.</p>
      {stat && (
        <div className="mb-8">
          <Kpis items={[
            ["Договори", stat.contracts.toLocaleString("bg-BG")],
            ["Обща стойност", fmtEur(stat.total_eur)],
            ["С една оферта", pctOf(stat.single_offer, stat.contracts), `${stat.single_offer} договора без конкуренция`],
            ["Възложители", stat.buyers != null ? String(stat.buyers) : "—", "общини, училища, болници и др."],
          ]} />
        </div>
      )}
      {showBreakdown && breakdown.length > 0 && (
        <More title={mu ? "По населени места" : ob ? "По общини" : "По области"} open>
          <BreakdownTable
            rows={breakdown}
            label={(r) => (mu ? `${r.is_village ? "с." : "гр."} ${r.settlement}` : ob ? `Община ${r.municipality}` : `${r.oblast}`)}
            link={(r) => (mu ? placeHref.settlement(mu.code, r.ekatte!, "porachki") : ob ? placeHref.muni(r.municipality_code!, "porachki") : placeHref.oblast(r.oblast!, "porachki"))}
          />
        </More>
      )}
      {suppliers.length > 0 && (
        <More title="Кой печели най-много" open>
          <ul className="divide-y divide-rule border-y border-rule text-[15px]">
            {suppliers.map((s) => (
              <li key={s.eik} className="py-2 grid grid-cols-[1fr_auto] gap-3">
                <span className="truncate"><Link href={firmUrl(s.eik)}>{s.name}</Link>{sg.get(s.eik) ? <SigBadge eik={s.eik} s={sg.get(s.eik)} /> : lk.get(s.eik) === 2 ? <span title="Фирма на длъжностно лице или депутат, или в декларация" className="text-red font-bold"> ●</span> : lk.get(s.eik) === 1 ? <span title="Връзка през бивш или настоящ съдружник, или съименник — проверете" className="text-[#e08a2e] font-bold"> ●</span> : null}</span>
                <span className="num whitespace-nowrap">{s.contracts} дог. · {fmtEur(s.total_eur)}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted mt-2"><span className="text-red">●</span> фирма на длъжностно лице или депутат · <span className="text-[#e08a2e]">●</span> връзка през съдружник (бивш или настоящ) или съименник — по Търговския регистър. Цветната значка е броят сигнали за фирмата (червена: има сериозен); натиснете я за подробности.</p>
        </More>
      )}
      <More title={`Най-голямо оскъпяване с анекси, последните 90 дни (${annexes.length})`}>
        <p className="text-[15px] text-muted mb-4 max-w-3xl">Анексът променя договора след подписването му. Голямото оскъпяване не е непременно нарушение, но заслужава въпрос: защо цената не е била ясна при търга?</p>
        <AnnexList items={annexes} />
      </More>
      <More title={`Големи договори само с една оферта (${single.length})`}>
        <p className="text-[15px] text-muted mb-4 max-w-3xl">Когато участва само един кандидат, няма с кого да се сравни цената.</p>
        <ContractList items={single} />
      </More>
      <More title={`Най-големите договори, последните 90 дни (${big.length})`}><ContractList items={big} /></More>
      <More title={`Последно сключени договори (${latest.length})`}><ContractList items={latest} /></More>
    </>
  );
}

