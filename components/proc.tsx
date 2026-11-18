import Link from "next/link";
import { localPage } from "@/lib/people";
import { type Annex, type Contract, buyerUrl, contractRef, contractUrl, firmUrl, fmtDate, fmtEur, politicalLinks } from "@/lib/procurement";

export function ContractList({ items, hideBuyer, hideSupplier }: { items: Contract[]; hideBuyer?: boolean; hideSupplier?: boolean }) {
  if (!items.length) return <p className="text-muted text-[15px]">Няма договори.</p>;
  return (
    <ul className="divide-y divide-rule border-y border-rule">
      {items.map((c) => (
        <li key={c.id} className="py-3 grid gap-1 sm:grid-cols-[1fr_auto] sm:gap-4">
          <div className="min-w-0">
            <Link href={contractUrl(c.id)} className="text-ink no-underline hover:underline font-semibold line-clamp-2">{c.tender_name}</Link>
            <p className="text-sm text-muted mt-0.5">
              {!hideBuyer && <><Link href={buyerUrl(c.buyer_eik)} className="text-muted">{c.buyer_name}</Link> · </>}
              {!hideSupplier && c.supplier_eiks.map((e, i) => (
                <span key={e}>{i > 0 && ", "}<Link href={firmUrl(e)}>{c.supplier_names[i] ?? e}</Link>{politicalLinks(e).length > 0 && <span title="Връзка с политик по Търговския регистър" className="text-red font-bold"> ●</span>}</span>
              ))}
              {!hideSupplier && " · "}{fmtDate(c.contract_date)}
            </p>
          </div>
          <div className="sm:text-right whitespace-nowrap">
            <p className="num font-semibold">{fmtEur(c.contract_value_eur)}{c.contract_value_eur != null && c.contract_value_eur < 100 && <span className="block text-xs text-muted font-normal">вероятно единична цена, не обща сума</span>}{c.contract_value_eur == null && <span className="block text-xs text-muted font-normal">договорът още не е обявен</span>}{c.contract_currency === "BGN" && <span className="block text-xs text-muted font-normal">договорен в лева</span>}</p>
            <p className="text-xs text-muted">
              {c.offers_count === 1 ? <span className="text-red font-semibold">1 оферта</span> : c.offers_count != null ? `${c.offers_count} оферти` : ""}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function AnnexList({ items }: { items: Annex[] }) {
  if (!items.length) return <p className="text-muted text-[15px]">Няма анекси.</p>;
  return (
    <ul className="divide-y divide-rule border-y border-rule">
      {items.map((a) => {
        const r = a.last_value_eur && a.value_difference_eur ? a.value_difference_eur / a.last_value_eur : null;
        return (
          <li key={a.id} className="py-3">
            <div className="flex flex-wrap justify-between gap-2">
              <Link href={contractUrl(contractRef(a.buyer_eik, a.contract_number))} className="font-semibold line-clamp-2 min-w-0 text-ink no-underline hover:underline">{a.tender_name}</Link>
              <p className="num whitespace-nowrap">
                {fmtEur(a.last_value_eur)} → <b>{fmtEur(a.current_value_eur)}</b>
                {r != null && <span className={`ml-2 text-sm font-semibold ${r > 0.25 ? "text-red" : ""}`}>{r > 0 ? "+" : ""}{Math.round(r * 100)}%</span>}
              </p>
            </div>
            <p className="text-sm text-muted mt-0.5">
              <Link href={buyerUrl(a.buyer_eik)} className="text-muted">{a.buyer_name}</Link> · {a.supplier_eiks.map((e, i) => <span key={e}>{i > 0 && ", "}<Link href={firmUrl(e)}>{a.supplier_names[i] ?? e}</Link></span>)} · анекс от {fmtDate(a.published_at)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export function LinksBox({ eik }: { eik: string }) {
  const l = politicalLinks(eik);
  if (!l.length) return <p className="text-[15px]">По Търговския регистър и декларациите не открихме връзка на фирмата с депутат или длъжностно лице. Това не изключва връзки чрез роднини или посредници.</p>;
  return (
    <ul className="space-y-2">
      {l.map((x) => (
        <li key={x.who + x.roles.join()} className="border-l-4 border-red pl-3">
          <p className="font-semibold">{x.mpId ? <Link href={`/parlament/deputat/${x.mpId}`}>{x.who}</Link> : localPage(x.who) ? <Link href={localPage(x.who)!}>{x.who}</Link> : x.who}</p>
          <p className="text-sm">{x.kind === "mp" ? `народен представител${x.party ? ` (${x.party})` : ""}` : x.position}: {x.roles.join(", ")}</p>
        </li>
      ))}
    </ul>
  );
}

export function SignalList({ items }: { items: { level: "high" | "mid"; text: string }[] }) {
  if (!items.length) return <p className="text-[15px]">Няма автоматични сигнали: имало е конкуренция, без анекси с оскъпяване и без открити политически връзки.</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((s) => (
        <li key={s.text} className="flex gap-2 text-[15px]">
          <span className={`mt-1.5 inline-block w-2.5 h-2.5 rounded-full shrink-0 ${s.level === "high" ? "bg-red" : "bg-[#e2b33b]"}`} />
          {s.text}
        </li>
      ))}
    </ul>
  );
}

export const NOT_READY = (
  <div className="bg-surface p-5 rounded-sm max-w-3xl">
    <p className="font-semibold">Данните още се зареждат</p>
    <p className="text-[15px] mt-1">Импортът от ЦАИС ЕОП тече. Страницата ще покаже договорите веднага щом първите дни бъдат записани в базата.</p>
  </div>
);
