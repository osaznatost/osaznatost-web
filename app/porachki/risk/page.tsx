import Link from "next/link";
import { MultiLine } from "@/components/Charts";
import { Page, SectionTitle, Title } from "@/components/ui";
import RISK from "@/data/risk.json";
import { buyerUrl, contractRef, firmUrl, fmtEur } from "@/lib/procurement";
import { fmt } from "@/lib/stats";

export const metadata = { title: "Риск в обществените поръчки" };

const FLAG: Record<string, string> = {
  single: "Само една оферта", direct: "Без открит конкурс", over: "Над прогнозната стойност", exact: "Цена почти равна на прогнозата при един участник",
  annex: "Оскъпяване с анекси над 10%", disq: "Отстранени конкуренти, остава един", threshold: "Цена точно под прага", political: "Изпълнител, свързан с политик", political_name: "Възможна връзка с длъжностно лице (по имена)", sub: "Над 50% подизпълнители",
  new: "Нова фирма (до година преди договора)", legal: "Законово обяснение (борса, монопол, закон)", short: "Кратък срок за оферти", changes: "Чести промени в условията",
};
type Agg = { key: string; name: string; n: number; value: number; risky: number; riskyValue: number; single: number; political: number; avg: number; muni?: string; oblast?: string; level?: string };

function Table({ rows, kind }: { rows: Agg[]; kind: "buyer" | "supplier" }) {
  const pc = (a: number, b: number) => (b ? `${fmt((a / b) * 100, 1)}%` : "–");
  return (
    <div className="overflow-x-auto"><table className="w-full text-[15px] num">
      <thead><tr className="text-left border-b border-rule text-sm text-muted"><th className="py-2 pr-3">{kind === "buyer" ? "Възложител" : "Изпълнител"}</th><th className="text-right px-2">Договори</th><th className="text-right px-2">Общо</th><th className="text-right px-2">С висок риск</th><th className="text-right px-2">Сума с висок риск</th><th className="text-right px-2">Една оферта</th>{kind === "supplier" && <th className="text-right px-2">Връзка с политик</th>}</tr></thead>
      <tbody>{rows.map((b) => (
        <tr key={b.key} className="border-b border-rule">
          <td className="py-1.5 pr-3"><Link href={kind === "buyer" ? buyerUrl(b.key) : firmUrl(b.key)}>{b.name}</Link>{b.muni && <span className="block text-xs text-muted">{b.muni}, {b.oblast}</span>}</td>
          <td className="text-right px-2">{b.n}</td><td className="text-right px-2">{fmtEur(b.value)}</td>
          <td className="text-right px-2">{b.risky} ({pc(b.risky, b.n)})</td><td className="text-right px-2 font-semibold">{fmtEur(b.riskyValue)}</td>
          <td className="text-right px-2">{pc(b.single, b.n)}</td>{kind === "supplier" && <td className="text-right px-2">{b.political ? "да" : ""}</td>}
        </tr>
      ))}</tbody></table></div>
  );
}

export default function Risk() {
  const R = RISK as unknown as { updated: string | null; total: number; annexes: number; from: string | null; flagCount: Record<string, number>; byScore: Record<string, number>; years: Agg[]; oblasts: Agg[]; buyers: Agg[]; suppliers: Agg[]; top: { id: string; buyer: string; buyerEik: string; number: string; suppliers: string[]; supplierEiks: string[]; title: string; date: string; value: number; flags: string[]; score: number }[] };
  if (!R.total) return <Page><Title back={{ href: "/porachki", label: "Поръчки" }}>Риск в обществените поръчки</Title><p className="text-[15px]">Класацията се изчислява при следващото обновяване на данните.</p></Page>;
  const pc = (a: number, b: number) => (b ? `${fmt((a / b) * 100, 1)}%` : "–");
  const yearsChart = R.years.flatMap((y) => [{ series: "Висок риск, % от договорите", x: Number(y.key), value: Math.round((y.risky / y.n) * 1000) / 10 }, { series: "Една оферта, % от договорите", x: Number(y.key), value: Math.round((y.single / y.n) * 1000) / 10 }]);
  return (
    <Page>
      <Title back={{ href: "/porachki", label: "Поръчки" }} kicker="Червени флагове за цялата страна"
        lead={<>Всеки договор от ЦАИС ЕОП ({R.total.toLocaleString("bg-BG")}, сключени от {R.years[0]?.key ?? R.from?.slice(0, 4)} г. насам) получава индекс на риска от 0 до 100 по червените флагове на OLAF и Европейската комисия. Тук са най-рисковите възложители, фирми и договори.</>}>
        Риск в обществените поръчки
      </Title>
      <section className="bg-surface rounded-sm p-4 mb-10 max-w-4xl text-[15px]">
        <p><b>Как да се чете.</b> Високият риск (45+ точки) означава, че в договора се срещат няколко признака, които в практиката на ЕС често съпътстват злоупотреби. Това е списък за проверка, не обвинение. Обратното също е вярно: договор без флагове може да е проблемен по причини, които данните не показват. <Link href="/porachki/metodologiya">Методология: как се смята всеки сигнал и кога греши</Link>.</p>
      </section>
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 mb-10">
        {[["Висок риск", R.byScore.high, "45+ точки"], ["Среден риск", R.byScore.mid, "20–44 точки"], ["Нисък риск", R.byScore.low, "под 20 точки"], ["Без флагове", R.byScore.none, ""]].map(([l, v, n]) => (
          <div key={l as string} className="bg-surface rounded-sm p-4"><p className="text-sm text-muted">{l}</p><p className="display num text-[1.6rem] sm:text-[2.2rem] leading-none mt-1 break-words">{(v as number).toLocaleString("bg-BG")}</p><p className="text-xs text-muted">{pc(v as number, R.total)} от договорите {n ? `· ${n}` : ""}</p></div>
        ))}
      </section>
      <section className="mb-12 grid gap-8 lg:grid-cols-2">
        <div><SectionTitle>Колко често се среща всеки флаг</SectionTitle>
          <ul className="space-y-2">{Object.entries(R.flagCount).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
            <li key={k} className="text-[15px]"><div className="flex justify-between"><span>{FLAG[k] ?? k}</span><span className="num">{n.toLocaleString("bg-BG")} · {pc(n, R.total)}</span></div><div className="h-2 rounded-full bg-surface mt-1"><div className="h-full rounded-full bg-red" style={{ width: `${(n / R.total) * 100}%` }} /></div></li>
          ))}</ul></div>
        <div><SectionTitle>По години</SectionTitle>{yearsChart.length > 0 && <MultiLine data={yearsChart} unit="%" height={280} />}</div>
      </section>
      <section className="mb-12"><SectionTitle>Възложители с най-много пари в рискови договори</SectionTitle><p className="text-[15px] text-muted -mt-3 mb-3">Само възложители с поне 20 договора.</p><Table rows={R.buyers.slice(0, 50)} kind="buyer" /></section>
      <section className="mb-12"><SectionTitle>Фирми с най-много пари от рискови договори</SectionTitle><Table rows={R.suppliers.slice(0, 50)} kind="supplier" /></section>
      <section className="mb-12"><SectionTitle>По области</SectionTitle>
        <div className="overflow-x-auto"><table className="w-full text-[15px] num"><thead><tr className="text-left border-b border-rule text-sm text-muted"><th className="py-2 pr-3">Област</th><th className="text-right px-2">Договори</th><th className="text-right px-2">Среден индекс</th><th className="text-right px-2">Висок риск</th><th className="text-right px-2">Една оферта</th><th className="text-right px-2">Сума с висок риск</th></tr></thead>
          <tbody>{R.oblasts.map((o) => <tr key={o.key} className="border-b border-rule"><td className="py-1.5 pr-3">{o.key}</td><td className="text-right px-2">{o.n}</td><td className="text-right px-2">{o.avg}</td><td className="text-right px-2">{pc(o.risky, o.n)}</td><td className="text-right px-2">{pc(o.single, o.n)}</td><td className="text-right px-2">{fmtEur(o.riskyValue)}</td></tr>)}</tbody></table></div>
      </section>
      <section className="mb-12"><SectionTitle>Най-рисковите договори над 50 000 €</SectionTitle>
        <ul className="divide-y divide-rule border-y border-rule text-[15px]">{R.top.slice(0, 100).map((t) => (
          <li key={t.id} className="py-2 grid sm:grid-cols-[3.5rem_1fr_auto] gap-x-3">
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red text-white text-center h-fit">{t.score}</span>
            <span><Link href={`/porachki/dogovor/${encodeURIComponent(contractRef(t.buyerEik, t.number))}`}>{t.title}</Link><span className="block text-sm text-muted">{t.buyer} → {t.suppliers.join(", ")} · {t.date} · {t.flags.map((f) => FLAG[f]?.toLowerCase() ?? f).join(", ")}</span></span>
            <span className="num">{fmtEur(t.value)}</span>
          </li>
        ))}</ul>
      </section>
      <p className="text-xs text-muted">Изчислено на {R.updated} от {R.total.toLocaleString("bg-BG")} договора и {R.annexes.toLocaleString("bg-BG")} анекса (ЦАИС ЕОП). Връзки с политици: Търговски регистър чрез „Наясно“. Правила: <Link href="/metodologiya">методология</Link>.</p>
    </Page>
  );
}
