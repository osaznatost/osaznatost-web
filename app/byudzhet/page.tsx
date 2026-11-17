import Link from "next/link";
import { LawAnalysis } from "@/components/LawAnalysis";
import { MoneyFlow, type FlowLink, type FlowNode } from "@/components/MoneyFlow";
import { TallyBar } from "@/components/parliament";
import { Page, SectionTitle, Title } from "@/components/ui";
import raw from "@/data/budget-2026.json";
import { getLaw } from "@/lib/laws";
import { PARTIES, formatDate, getVote, partyBreakdown, partyName, partyPosition } from "@/lib/parliament";

export const metadata = { title: "Държавният бюджет 2026" };

type Line = { code: string; label: string; eur: number | null; lines: Line[] };
type TLine = { code: string; depth: number; labelBg: string; plannedEur: number };
const B = raw as unknown as {
  source: string; year: number; revenue: { total: number; lines: Line[] }; expenditure: { total: number; lines: Line[] };
  euContribution: number; transfers: { lines: TLine[]; totalEur: number }; balance: number;
  ministries: { name: string; planned: number }[];
  execution: { throughMonth: number; revenue: { ytdEur: number; annualisedEur: number; lowEur: number; highEur: number }; expenditure: { ytdEur: number; annualisedEur: number; lowEur: number; highEur: number } };
  history: { year: number; revenue: number; expenditure: number; transfers: number | null; balance: number | null }[];
};

const bn = (n: number, d = 2) => `${(n / 1e9).toLocaleString("bg-BG", { maximumFractionDigits: d, minimumFractionDigits: d })} млрд. €`;
const mn = (n: number) => `${Math.round(n / 1e6).toLocaleString("bg-BG")} млн. €`;
const POS: Record<string, string> = { y: "За", n: "Против", a: "Въздържал се", split: "Разделени", absent: "Отсъства" };
const MONTHS = ["", "януари", "февруари", "март", "април", "май", "юни", "юли", "август", "септември", "октомври", "ноември", "декември"];

function Bars({ items, color = "#1F4D3A" }: { items: { label: string; value: number; note?: string }[]; color?: string }) {
  const max = Math.max(...items.map((i) => i.value));
  return (
    <ul className="space-y-2.5">
      {items.map((i) => (
        <li key={i.label}>
          <div className="flex justify-between gap-3 text-[15px]"><span>{i.label}</span><b className="num whitespace-nowrap">{mn(i.value)}</b></div>
          <div className="h-2.5 bg-surface rounded-sm mt-1"><div className="h-full rounded-sm" style={{ width: `${(i.value / max) * 100}%`, background: color }} /></div>
          {i.note && <p className="text-xs text-muted mt-0.5">{i.note}</p>}
        </li>
      ))}
    </ul>
  );
}

function VoteCard({ id, label }: { id: string; label: string }) {
  const v = getVote(id);
  if (!v) return null;
  const br = partyBreakdown(v);
  return (
    <div className="ring-1 ring-rule rounded-sm p-4">
      <p className="font-semibold"><Link href={`/parlament/glasuvane/${v.id}`}>{label}</Link></p>
      <p className="text-sm text-muted mb-3">{formatDate(v.date)} · за {v.tally.yes}, против {v.tally.no}, въздържал се {v.tally.abstain}</p>
      <ul className="space-y-1.5 text-sm">
        {PARTIES.filter((p) => br[p]).map((p) => (
          <li key={p} className="grid grid-cols-[150px_1fr_90px] gap-2 items-center">
            <span className="truncate">{partyName(p)}</span>
            <TallyBar c={br[p]} height={8} />
            <span className="text-right font-semibold">{POS[partyPosition(br[p])]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Редовете са плосък списък: децата на „1“ са „1.1“, „1.2“ и т.н. */
const kids = (all: Line[], code: string) => all.filter((l) => new RegExp(`^${code.replace(".", "\\.")}\\.\\d+$`).test(l.code));

export default function Byudzhet() {
  const taxes = B.revenue.lines.find((l) => l.code === "1")!;
  const nonTax = B.revenue.lines.find((l) => l.code === "2")!;
  const tr = (code: string) => B.transfers.lines.find((l) => l.code === code)?.plannedEur ?? 0;
  const deficit = -B.balance;
  const topMin = B.ministries.slice(0, 8);
  const ministriesSum = B.ministries.reduce((s, m) => s + (m.planned ?? 0), 0);
  const otherMin = ministriesSum - topMin.reduce((s, m) => s + m.planned, 0);
  const central = B.expenditure.total - ministriesSum;

  // Паричният поток на централния бюджет: откъде идват и къде отиват парите.
  const taxNodes = kids(B.revenue.lines, "1").filter((l) => (l.eur ?? 0) > 1e9);
  const otherTax = (taxes.eur ?? 0) - taxNodes.reduce((s, l) => s + (l.eur ?? 0), 0);
  const nodes: FlowNode[] = [
    ...taxNodes.map((l) => ({ id: `r${l.code}`, label: l.label.replace("Данък върху добавената стойност", "ДДС").replace("Данъци върху доходите на физически лица", "Данък върху доходите"), kind: "source" as const })),
    { id: "rOther", label: "Други данъци", kind: "source" },
    { id: "rNon", label: "Неданъчни приходи (такси, дивиденти)", kind: "source" },
    { id: "rDebt", label: "Дефицит: нов дълг", kind: "annex" },
    { id: "budget", label: "Централен бюджет", kind: "buyer" },
    { id: "tDoo", label: "НОИ: пенсии и обезщетения", kind: "supplier" },
    { id: "tMuni", label: "Общините", kind: "supplier" },
    { id: "tNzok", label: "Здравната каса", kind: "supplier" },
    { id: "tEu", label: "Съфинансиране на еврофондове", kind: "supplier" },
    { id: "eu", label: "Вноска в бюджета на ЕС", kind: "sub" },
    ...topMin.map((m, i) => ({ id: `m${i}`, label: m.name.replace("Министерство на", "М-во на"), kind: "sub" as const })),
    { id: "mOther", label: "Други министерства и органи", kind: "sub" },
    { id: "central", label: "Лихви, резерви и централни разходи", kind: "unknown" },
  ];
  const links: FlowLink[] = [
    ...taxNodes.map((l) => ({ source: `r${l.code}`, target: "budget", value: l.eur ?? 0 })),
    { source: "rOther", target: "budget", value: otherTax },
    { source: "rNon", target: "budget", value: (nonTax.eur ?? 0) },
    { source: "rDebt", target: "budget", value: deficit },
    { source: "budget", target: "tDoo", value: tr("1.2") },
    { source: "budget", target: "tMuni", value: tr("1.1") },
    { source: "budget", target: "tNzok", value: tr("1.3") },
    { source: "budget", target: "tEu", value: tr("1.4") + tr("1.5") },
    { source: "budget", target: "eu", value: B.euContribution },
    ...topMin.map((m, i) => ({ source: "budget", target: `m${i}`, value: m.planned })),
    { source: "budget", target: "mOther", value: otherMin },
    { source: "budget", target: "central", value: central },
  ];

  const cur = kids(B.expenditure.lines, "1");
  const NAMES: Record<string, string> = { "1.1": "Заплати и осигуровки на служителите", "1.2": "Субсидии за предприятия и организации", "1.3": "Лихви по дълга", "1.4": "Социални плащания към домакинствата" };
  const econ = [
    ...cur.map((l) => ({ label: NAMES[l.code] ?? l.label, value: l.eur ?? 0 })),
    { label: "Издръжка (стоки, услуги, ток, горива)", value: (B.expenditure.lines.find((l) => l.code === "1")?.eur ?? 0) - cur.reduce((x, l) => x + (l.eur ?? 0), 0) },
    { label: "Капиталови разходи (строителство, ремонти, техника)", value: B.expenditure.lines.find((l) => l.code === "2")?.eur ?? 0 },
  ].sort((a, b) => b.value - a.value);

  const ex = B.execution;
  const law = getLaw("darzhavniya-byudzhet-na-republika-balgariya-za-2026-g");

  return (
    <Page>
      <Title lead="Откъде идват парите на държавата, къде отиват, кой ги гласува и какво се очаква. Числата са от закона, приет на 24 юли 2026 г., и от отчетите за изпълнението му.">
        Държавният бюджет 2026
      </Title>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {[
          ["Всички разходи на държавата", "56,8 млрд. €", "консолидирана програма: централен бюджет, НОИ, Здравна каса, общини"],
          ["Всички приходи", "49,6 млрд. €", "данъци, осигуровки, еврофондове"],
          ["Дефицит", "7,2 млрд. €", "5,7% от БВП, най-високият от 20 години"],
          ["Таван на новия дълг", "10,1 млрд. €", "от тях до 3,26 млрд. € заем за отбрана (SAFE)"],
        ].map(([l, v, n]) => (
          <div key={l} className="bg-surface rounded-sm p-4">
            <p className="text-sm text-muted">{l}</p>
            <p className="display num text-[2.6rem] leading-none mt-1">{v}</p>
            <p className="text-sm mt-1">{n}</p>
          </div>
        ))}
      </section>
      <p className="text-xs text-muted mb-12">Обобщените числа са по закона и анализите, цитирани по-долу (източници [2], [3] и [4]). Разбивката под тях е за централния бюджет, по данни на Министерството на финансите.</p>

      <section className="mb-14">
        <SectionTitle>Откъде идват и къде отиват парите</SectionTitle>
        <p className="text-[16px] max-w-3xl -mt-2 mb-4">
          Централният бюджет събира <b>{bn(B.revenue.total)}</b>, почти половината от ДДС. Харчи сам <b>{bn(B.expenditure.total)}</b> (министерства, съдебна власт, лихви) и прехвърля <b>{bn(B.transfers.totalEur)}</b> на НОИ, общините и Здравната каса. Разликата от <b>{bn(deficit)}</b> се покрива с нов дълг.
        </p>
        <div className="ring-1 ring-rule rounded-sm p-4 bg-white"><MoneyFlow nodes={nodes} links={links} /></div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2 mb-14">
        <div>
          <SectionTitle>За какво се харчи</SectionTitle>
          <Bars items={econ} />
          <p className="text-sm text-muted mt-3">Разходите на министерствата и органите по вид. Пенсиите са в бюджета на НОИ, затова тук са като трансфер (по-горе).</p>
        </div>
        <div>
          <SectionTitle>Кой колко получава</SectionTitle>
          <Bars items={B.ministries.slice(0, 14).map((m) => ({ label: m.name, value: m.planned }))} color="#3d5a80" />
        </div>
      </section>

      <section className="mb-14">
        <SectionTitle>Как се изпълнява досега</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            ["Приходи", ex.revenue, B.revenue.total],
            ["Разходи (с трансферите)", ex.expenditure, B.expenditure.total + B.transfers.totalEur],
          ].map(([l, e, plan]) => {
            const x = e as typeof ex.revenue, p = plan as number;
            return (
              <div key={l as string} className="ring-1 ring-rule rounded-sm p-4">
                <p className="font-semibold">{l as string}, януари–{MONTHS[ex.throughMonth]}</p>
                <p className="display num text-[2.4rem] leading-none mt-2">{bn(x.ytdEur)}</p>
                <p className="text-[15px] mt-2">При обичайния ритъм това значи около <b>{bn(x.annualisedEur, 1)}</b> за цялата година (между {bn(x.lowEur, 1)} и {bn(x.highEur, 1)}).{l === "Приходи" && <> Планът е {bn(p, 1)}: {x.annualisedEur < p ? <span className="text-red font-semibold">очаква се недостиг от около {bn(p - x.annualisedEur, 1)}</span> : "приходите вървят по план"}.</>}</p>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted mt-2">Оценката за цялата година е по дела, който първите {ex.throughMonth} месеца обичайно имат в годината (2022–2025). {B.source}.</p>
      </section>

      <section className="mb-14">
        <SectionTitle>Кой гласува бюджета</SectionTitle>
        <div className="grid gap-4 lg:grid-cols-2">
          <VoteCard id="2026-07-15-13" label="Първо четене, 15 юли 2026 г." />
          <VoteCard id="2026-07-24-14" label="Второ четене, член 1 (приходите и разходите), 24 юли 2026 г." />
        </div>
        <p className="text-[15px] mt-3 max-w-3xl">На първо четене бюджетът мина с гласовете на „Прогресивна България“ и ДПС. На второ четене основният член мина само с гласовете на „Прогресивна България“, а ДПС гласува против. Проектът на съдебната власт, внесен отделно от ВСС, беше отхвърлен без нито един глас „за“. <Link href="/parlament/zakon/darzhavniya-byudzhet-na-republika-balgariya-za-2026-g">Всички гласувания по бюджета</Link>.</p>
      </section>

      {law && (
        <section className="mb-14 max-w-4xl">
          <SectionTitle>Защо, критиките и какво се очаква</SectionTitle>
          <p className="text-[17px]">{law.summary}</p>
          <LawAnalysis law={law} />
        </section>
      )}
    </Page>
  );
}
