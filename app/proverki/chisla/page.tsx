import Link from "next/link";
import { Page, Title } from "@/components/ui";
import { VERDICT, autoChecks } from "@/lib/autoChecks";
import { MPS } from "@/lib/parliament";

export const metadata = { title: "Числата в парламента: автоматична сверка" };

const fmt = (d: string) => d.split("-").reverse().join(".");
const num = (v: number, unit: string) => `${v.toLocaleString("bg-BG")}${unit === "%" ? "%" : " €"}`;
const key = (n: string) => { const p = n.trim().toLowerCase().split(/\s+/); return `${p[0]} ${p.at(-1)}`; };

export default function Chisla() {
  const { updated, checks } = autoChecks();
  const mp = new Map(MPS.map((m) => [key(m.name), m]));
  const count = (v: keyof typeof VERDICT) => checks.filter((c) => c.verdict === v).length;
  return (
    <Page>
      <Title back={{ href: "/proverki", label: "Проверки" }} kicker="Автоматична сверка" lead={<>Всяка нощ програмата чете стенограмите на парламента, намира изказвания с конкретно число за инфлацията, безработицата, дълга, дефицита, растежа или минималната заплата и го сравнява с официалните данни на Евростат. Без изкуствен интелект и без човешка оценка: само правило. Обновено: {updated ? fmt(updated) : "—"}.</>}>
        Числата в парламента
      </Title>

      <section className="grid grid-cols-3 gap-3 mb-8 max-w-3xl">
        {(["match", "close", "off"] as const).map((v) => (
          <div key={v} className="bg-surface rounded-sm p-4">
            <p className={`text-xs font-semibold rounded-full px-2 py-0.5 w-fit ${VERDICT[v].cls}`}>{VERDICT[v].label}</p>
            <p className="display num text-[2rem] sm:text-[2.6rem] leading-none mt-2">{count(v)}</p>
          </div>
        ))}
      </section>

      <details className="mb-8 max-w-4xl bg-surface rounded-sm p-4 text-[15px]">
        <summary className="cursor-pointer font-semibold">Как работи и какво не прави</summary>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Сравнява се само числото, не цялото твърдение. Думите около него (кой е виновен, какво следва) не се оценяват.</li>
          <li>Сверява се само когато периодът е ясен: изречението назовава една година (сравнява се с официалната стойност за нея) или говори за сегашното положение — „в момента“, „към днешна дата“ (сравнява се с последните публикувани данни).</li>
          <li>Нарочно строго: пропускат се бюджети и планове, предложения, хипотези („по стария механизъм щеше…“), преразказ на чужди думи, сравнения „спрямо“, нетни и годишни суми, различни методики (начислена/касова основа, дерогации). По-добре по-малко проверки, отколкото несправедливи.</li>
          <li>„Над 20%“ и „под 3%“ се проверяват като неравенство, не като точно число.</li>
          <li>„Съвпада“: разлика до 0,5 пункта (дълг — до 1,5 пункта; минимална заплата — до 2 €). „Близо“: до двойно повече. „Разминава се“: повече от това.</li>
          <li>Изказванията за прогнози, цели, други държави и еврозоната се пропускат. Ако човек е имал предвид друг показател (напр. инфлация на храните) или друг период, сверката може да е несправедлива — затова винаги има линк към стенограмата и към данните.</li>
        </ul>
      </details>

      <ul className="space-y-3 max-w-5xl">
        {checks.slice(0, 300).map((c) => {
          const m = mp.get(key(c.who));
          return (
            <li key={c.id} className="ring-1 ring-rule rounded-sm bg-white p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 ${VERDICT[c.verdict].cls}`}>{VERDICT[c.verdict].label}</span>
                <span className="font-semibold">{m ? <Link href={`/parlament/deputat/${m.id}`}>{c.who}</Link> : c.who}</span>
                {c.group && <span className="text-sm text-muted">{c.group}</span>}
                <a href={c.url} target="_blank" rel="noreferrer" className="text-sm ml-auto">стенограма, {fmt(c.date)}</a>
              </div>
              <p className="text-[15px] mt-2">„{c.text}“</p>
              <p className="text-sm mt-2"><b>{c.indicator}:</b> казано {num(c.value, c.unit)}; официално {num(c.official, c.unit)} за {c.period.replace(/^(\d{4})-(\d\d)$/, "$2.$1")} (<a href={c.source} target="_blank" rel="noreferrer">Евростат</a>){c.verdict !== "match" && <>, разлика {c.diff.toLocaleString("bg-BG")}{c.unit === "%" ? " пункта" : " €"}</>}.</p>
            </li>
          );
        })}
      </ul>
      {checks.length === 0 && <p className="text-muted">Данните се събират. Първата сверка ще се появи след нощното обновяване.</p>}
    </Page>
  );
}
