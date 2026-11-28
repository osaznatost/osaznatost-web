import Link from "next/link";
import { firmSigMany } from "@/lib/firmSignals";
import { SigBadge } from "@/components/SigBadge";
import { powerHref, powerLinks } from "@/lib/tr";
import { peopleLinks } from "@/lib/people";
import { type Annex, type Contract, buyerUrl, contractRef, contractUrl, firmUrl, fmtDate, fmtEur, politicalLinks } from "@/lib/procurement";
import { isPublicFirm, politicalStrength } from "@/lib/politicalFlag.mjs";

/** Точка до името на фирмата: червена при силна връзка с политик, оранжева при възможна (по имена). */
export async function PolDot({ eik }: { eik: string }) {
  const sg = (await firmSigMany([eik]).catch(() => null))?.get(eik);
  if (sg?.n) return <SigBadge eik={eik} s={sg} />;
  const s = politicalStrength(politicalLinks(eik));
  if (s === 2) return <span title="Връзка с политик (депутат или декларирана)" className="text-red font-bold"> ●</span>;
  if (s === 1) return <span title="Възможна връзка с длъжностно лице, само по имена" className="text-[#e08a2e] font-bold"> ●</span>;
  return null;
}

/** Първите `first` реда се виждат, останалите са под „Покажи още“ — за да не става страницата безкрайна на телефона. */
function More<T>({ items, first, render, label }: { items: T[]; first: number; render: (x: T[]) => React.ReactNode; label: string }) {
  if (items.length <= first + 3) return <>{render(items)}</>;
  return (
    <>
      {render(items.slice(0, first))}
      <details className="mt-1">
        <summary className="cursor-pointer font-semibold text-green py-2">Покажи още {items.length - first} {label}</summary>
        {render(items.slice(first))}
      </details>
    </>
  );
}

export function ContractList({ items, hideBuyer, hideSupplier, first = 15 }: { items: Contract[]; hideBuyer?: boolean; hideSupplier?: boolean; first?: number }) {
  if (!items.length) return <p className="text-muted text-[15px]">Няма договори.</p>;
  return <More items={items} first={first} label="договора" render={(xs) => <ContractRows items={xs} hideBuyer={hideBuyer} hideSupplier={hideSupplier} />} />;
}

function ContractRows({ items, hideBuyer, hideSupplier }: { items: Contract[]; hideBuyer?: boolean; hideSupplier?: boolean }) {
  return (
    <ul className="divide-y divide-rule border-y border-rule">
      {items.map((c) => (
        <li key={c.id} className="py-3 grid gap-1 sm:grid-cols-[1fr_auto] sm:gap-4">
          <div className="min-w-0">
            <Link href={contractUrl(c.id)} className="text-ink no-underline hover:underline font-semibold line-clamp-2">{c.tender_name}</Link>
            <p className="text-sm text-muted mt-0.5">
              {!hideBuyer && <><Link href={buyerUrl(c.buyer_eik)} className="text-muted">{c.buyer_name}</Link> · </>}
              {!hideSupplier && c.supplier_eiks.map((e, i) => (
                <span key={e}>{i > 0 && ", "}<Link href={firmUrl(e)}>{c.supplier_names[i] ?? e}</Link><PolDot eik={e} /></span>
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

export function AnnexList({ items, first = 8 }: { items: Annex[]; first?: number }) {
  if (!items.length) return <p className="text-muted text-[15px]">Няма анекси.</p>;
  return <More items={items} first={first} label="анекса" render={(xs) => <AnnexRows items={xs} />} />;
}

function AnnexRows({ items }: { items: Annex[] }) {
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

export async function LinksBox({ eik }: { eik: string }) {
  const { localPage } = await peopleLinks();
  const l = politicalLinks(eik);
  const tr = await powerLinks(eik);
  const trBox = tr.length ? (
    <ul className="space-y-2 mb-3">{tr.slice(0, 12).map((h, i) => { const href = powerHref(h.code, h.s); return (
      <li key={i} className="border-l-4 pl-3 border-red">
        <p className="font-semibold">{href ? <Link href={href}>{h.name}</Link> : h.name} <span className="text-sm font-normal text-muted">· {h.code === "MP" ? "народен представител" : h.role.toLowerCase()}</span></p>
        <p className="text-sm">{h.k === "own" ? `${h.now ? "вписан(а) във фирмата" : "бил(а) вписан(а) във фирмата"}: ${h.how ?? ""}` : `фирмата е на ${h.partner}, който е бил съдружник или управител заедно с ${h.name.split(" ")[0]}${h.via?.length ? ` в ${h.via.join(", ")}` : ""}`}</p>
      </li>); })}
    </ul>
  ) : null;
  if (!l.length && trBox) return <><p className="text-[15px] mb-3">По Търговския регистър с историята (бивши и настоящи управители и съдружници). Съвпадението е по три имена, без ЕГН.</p>{trBox}</>;
  if (!l.length) return <p className="text-[15px]">По Търговския регистър и декларациите не открихме връзка на фирмата с депутат или длъжностно лице. Това не изключва връзки чрез роднини или посредници.</p>;
  const pub = isPublicFirm(l), st = politicalStrength(l);
  return (
    <>
    {trBox}
    <p className="text-[15px] mb-3">{pub ? "Държавно или общинско дружество: управителите и „действителният собственик“ по закон са назначени лица, затова не броим това за личен интерес. Списъкът показва кой е бил в ръководството." : st === 1 ? "Съвпадение само по три имена (без ЕГН): възможно е да е съименник. Проверете в Търговския регистър." : "По Търговския регистър и декларациите (обработени от „Наясно“). Съвпадението е по три имена."}</p>
    <ul className="space-y-2">
      {l.map((x) => (
        <li key={x.who + x.roles.join()} className={`border-l-4 pl-3 ${pub ? "border-rule" : "border-red"}`}>
          <p className="font-semibold">{x.mpId ? <Link href={`/parlament/deputat/${x.mpId}`}>{x.who}</Link> : localPage(x.who) ? <Link href={localPage(x.who)!}>{x.who}</Link> : x.who}</p>
          <p className="text-sm">{x.kind === "mp" ? `народен представител${x.party ? ` (${x.party})` : ""}` : x.position}: {x.roles.join(", ")}</p>
        </li>
      ))}
    </ul>
    </>
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
