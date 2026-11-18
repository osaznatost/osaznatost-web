// Какво пише в Търговския регистър за фирмата: кога е създадена, кой я управлява и кой я притежава.
import Link from "next/link";
import { personPage } from "@/lib/people";
import { firmUrl } from "@/lib/procurement";
import { foundedYear, firmsOfPerson, type TrPerson, trFor } from "@/lib/tr";

function Who({ p }: { p: TrPerson }) {
  if (p.eik) return <Link href={firmUrl(p.eik)}>{p.name}</Link>;
  const page = p.name.split(/\s+/).length >= 3 ? personPage(p.name) : null;
  const other = p.name.split(/\s+/).length >= 3 ? firmsOfPerson(p.name).length : 0;
  return <>{page ? <Link href={page}>{p.name}</Link> : p.name}{p.share ? <span className="text-muted"> ({p.share})</span> : null}{other > 1 ? <span className="text-sm text-muted"> · още {other - 1} фирми с поръчки</span> : null}</>;
}

export function TrBox({ eik }: { eik: string }) {
  const t = trFor(eik);
  if (!t) return <p className="text-[15px] text-muted">Още не сме прочели фирмата в Търговския регистър. Обхождаме всички изпълнители поред, по 1 заявка на 5 секунди, както допуска Агенцията по вписванията.</p>;
  const year = foundedYear(t);
  const rows: [string, TrPerson[]][] = [["Управители", t.managers], ["Съвет", t.board], ["Съдружници", t.partners], ["Едноличен собственик", t.owner], ["Действителни собственици", t.ubo], ["Прокуристи", t.procurator]];
  return (
    <div className="grid gap-6 lg:grid-cols-2 text-[15px]">
      <dl className="grid grid-cols-[10rem_1fr] gap-x-3 gap-y-1.5">
        <dt className="text-muted">Правна форма</dt><dd>{t.form ?? "–"}</dd>
        <dt className="text-muted">Създадена</dt><dd>{year ?? "преди 2008 г."}{t.founded ? " (по номера на фирменото дело)" : ""}</dd>
        <dt className="text-muted">Седалище</dt><dd>{t.town ? `${t.town}${t.muni ? `, община ${t.muni}` : ""}` : "–"}</dd>
        {t.capital && <><dt className="text-muted">Капитал</dt><dd>{t.capital}</dd></>}
        {t.activity && <><dt className="text-muted">Предмет на дейност</dt><dd className="text-sm">{t.activity}</dd></>}
      </dl>
      <dl className="grid grid-cols-[10rem_1fr] gap-x-3 gap-y-1.5">
        {rows.filter(([, ps]) => ps.length).map(([l, ps]) => (
          <div key={l} className="contents"><dt className="text-muted">{l}</dt><dd><ul className="space-y-0.5">{ps.map((p, i) => <li key={i}><Who p={p} /></li>)}</ul></dd></div>
        ))}
      </dl>
      <p className="text-xs text-muted lg:col-span-2">Източник: Търговски регистър, Агенция по вписванията, прочетено на {t.fetched.split("-").reverse().join(".")}. Връзките между хора са по три имена, не по ЕГН: възможни са съвпадения на имена.</p>
    </div>
  );
}

/** Фирмите на човек по Търговския регистър (за профила на депутат или длъжностно лице). */
export function PersonFirms({ name }: { name: string }) {
  const fs = firmsOfPerson(name);
  if (!fs.length) return null;
  return (
    <div className="text-[15px]">
      <ul className="space-y-1">{fs.map(({ eik, roles, firm }) => <li key={eik}><Link href={firmUrl(eik)}>{firm?.name ?? eik}</Link> <span className="text-sm text-muted">· {roles.join(", ")}{firm?.town ? ` · ${firm.town}` : ""}</span></li>)}</ul>
      <p className="text-xs text-muted mt-1">По Търговския регистър, само фирми с обществени поръчки. Съвпадение по три имена: проверете, че е същият човек.</p>
    </div>
  );
}
