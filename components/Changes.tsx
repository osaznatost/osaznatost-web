import Link from "next/link";
import { connection } from "next/server";
import { data } from "@/lib/data";
import { contractRef, contractUrl, firmUrl, fmtDate, fmtEur, politicalLinks } from "@/lib/procurement";
import { officialHref, officialLinks } from "@/components/PersonLinks";
import { muniSlug, oblastSlug } from "@/lib/regions";

type PAnnex = { id: string; day: string; tender_name: string; buyer_eik: string; buyer_name: string; contract_number: string; supplier_eiks: string[]; supplier_names: string[]; value_difference_eur: number | null; current_value_eur?: number | null; muni?: string };
type PSub = { id: string; day: string; tender_name: string; buyer_name: string; contract_date: string | null; contract_value_eur: number | null; supplier_eiks: string[]; subcontractor_names: string | null; subcontractor_eiks: string | null; subcontracting_percent: string | null; muni?: string };
type Council = { code: string; muni: string; id: string; date: string; number: string; title: string; url: string | null; tally: { for: number; against: number; abstain: number } | null; result: string | null; kinds: string[]; firms: string[]; by: string | null };

const since = (days: number) => new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
const muniHref = (code: string) => `/mesta/${oblastSlug(code)}/${muniSlug(code)}`;

/** Червен знак, ако фирмата е свързана с политик или длъжностно лице (декларации или Търговския регистър с историята). */
async function Flag({ eiks }: { eiks: string[] }) {
  const rs = (await Promise.all(eiks.map((e) => officialLinks(e)))).flat();
  const pl = eiks.flatMap((e) => politicalLinks(e));
  if (!rs.length && !pl.length) return null;
  const r = rs[0];
  return (
    <span className="block text-sm mt-1 text-red">
      ● Свързана с {r ? <><Link href={officialHref(r)} className="text-red">{r.n}</Link> ({r.r.toLowerCase()}{r.via ? `, през ${r.via.toLowerCase()}` : ""})</> : <>{pl[0].who}{pl[0].position ? ` (${pl[0].position})` : ""}</>}
      {rs.length + pl.length > 1 ? ` и още ${rs.length + pl.length - 1}` : ""}
    </span>
  );
}

/** „Какво се промени“: нови анекси с увеличение, договори с подизпълнители, решения на съвета за общинско имущество. */
export async function Changes({ code, days = 90 }: { code?: string; days?: number }) {
  await connection(); // само при отваряне, не при изграждането (иначе 265 общини × заявки към базата)
  const from = since(days);
  const [proc, council] = await Promise.all([
    data<{ annexes: PAnnex[]; subs: PSub[] }>("changes/proc.json").then((x) => x ?? { annexes: [], subs: [] }),
    data<Council[]>("changes/council.json").then((x) => (x ?? []).filter((r) => r.date >= from && (!code || r.code === code))),
  ]);
  const here = <T extends { day: string; muni?: string }>(x: T) => x.day >= from && (!code || x.muni === code);
  const annexes = proc.annexes.filter(here).sort((a, b) => (b.value_difference_eur ?? 0) - (a.value_difference_eur ?? 0));
  const subs = proc.subs.filter(here);
  const card = "ring-1 ring-rule rounded-sm bg-white p-4";
  return (
    <div className="grid gap-6 lg:grid-cols-3 text-[15px]">
      <section className={card}>
        <h3 className="font-semibold mb-1">Анекси с увеличение на цената</h3>
        <p className="text-sm text-muted mb-3">Най-големите увеличения за последните {days} дни.</p>
        {annexes.length === 0 ? <p className="text-muted">Няма.</p> : (
          <ul className="space-y-3">{annexes.slice(0, 12).map((a) => (
            <li key={a.id}>
              <Link href={contractUrl(contractRef(a.buyer_eik, a.contract_number))} className="line-clamp-2">{a.tender_name}</Link>
              <span className="block text-sm"><b className="num">+{fmtEur(a.value_difference_eur)}</b> · {fmtDate(a.day)} · {a.buyer_name}</span>
              {((a.value_difference_eur ?? 0) > 50e6 || (a.current_value_eur && (a.value_difference_eur ?? 0) > 0.9 * a.current_value_eur)) && <span className="block text-xs text-muted">Необичайно голяма промяна: възможна е грешка при въвеждането в ЦАИС ЕОП. Проверете обявлението.</span>}
              <span className="block text-sm text-muted">Изпълнител: {a.supplier_names.map((n, i) => <span key={i}>{i > 0 && ", "}{a.supplier_eiks[i] ? <Link href={firmUrl(a.supplier_eiks[i])}>{n}</Link> : n}</span>)}</span>
              <Flag eiks={a.supplier_eiks} />
            </li>
          ))}</ul>
        )}
      </section>

      <section className={card}>
        <h3 className="font-semibold mb-1">Нови договори с подизпълнители</h3>
        <p className="text-sm text-muted mb-3">Кой реално ще работи по обекта, освен спечелилата фирма.</p>
        {subs.length === 0 ? <p className="text-muted">Няма.</p> : (
          <ul className="space-y-3">{subs.slice(0, 12).map((c) => {
            const se = (c.subcontractor_eiks ?? "").split(/[,;\s]+/).filter((x) => /^\d{9,13}$/.test(x));
            return (
              <li key={c.id}>
                <Link href={contractUrl(c.id)} className="line-clamp-2">{c.tender_name}</Link>
                <span className="block text-sm">{fmtEur(c.contract_value_eur)} · {fmtDate(c.contract_date)} · {c.buyer_name}</span>
                <span className="block text-sm text-muted">Подизпълнители: {c.subcontractor_names || "посочени, без имена"}{c.subcontracting_percent ? ` (${c.subcontracting_percent}%)` : ""}</span>
                <Flag eiks={[...c.supplier_eiks, ...se]} />
              </li>
            );
          })}</ul>
        )}
      </section>

      <section className={card}>
        <h3 className="font-semibold mb-1">Общинско имущество: наем, продажба, концесия</h3>
        <p className="text-sm text-muted mb-3">Решения на общинските съвети за последните {days} дни.</p>
        {council.length === 0 ? <p className="text-muted">Няма.</p> : (
          <ul className="space-y-3">{council.slice(0, 15).map((r) => (
            <li key={r.id}>
              <span className="block text-sm text-muted">{fmtDate(r.date)}{!code && <> · <Link href={`${muniHref(r.code)}#vlast`}>{r.muni}</Link></>} · {r.kinds.join(", ")}</span>
              {r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="line-clamp-3">№ {r.number} {r.title}</a> : <span className="line-clamp-3">№ {r.number} {r.title}</span>}
              {r.firms.length > 0 && <span className="block text-sm">Фирми в решението: {r.firms.join(", ")}</span>}
              {r.tally && <span className="block text-sm text-muted">{r.tally.for} за, {r.tally.against} против, {r.tally.abstain} въздържали се{r.by ? ` · внася ${r.by}` : ""}</span>}
            </li>
          ))}</ul>
        )}
        {council.length > 15 && <p className="text-sm text-muted mt-3">и още {council.length - 15}{code ? <> · <Link href={`${muniHref(code)}/resheniya`}>всички решения</Link></> : ""}</p>}
      </section>
    </div>
  );
}
