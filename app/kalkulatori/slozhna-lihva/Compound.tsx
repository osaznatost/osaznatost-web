"use client";

import { useMemo, useState } from "react";
import { CalcLayout, NumInput } from "@/components/CalcLayout";
import { GrowthChart } from "@/components/Charts";
import { Disclaimer, Field, Sources, eur, num } from "@/components/ui";
import { futureValue, realValue } from "@/lib/calc";
import { P } from "@/lib/params";

export function Compound() {
  const [start, setStart] = useState(1000);
  const [monthly, setMonthly] = useState(200);
  const [years, setYears] = useState(20);
  const [deposit, setDeposit] = useState(P.depositRate.value * 100);
  const [bond, setBond] = useState(4);
  const [stocks, setStocks] = useState(7);
  const [fee, setFee] = useState(0.3);
  const [inflation, setInflation] = useState(P.cpiYoY.value * 100);

  const scenarios = useMemo(() => {
    const list = [
      { name: "Без лихва", rate: 0, fee: 0 },
      { name: "Депозит", rate: deposit / 100, fee: 0 },
      { name: "Облигации", rate: bond / 100, fee: fee / 100 },
      { name: "Акции (индекс)", rate: stocks / 100, fee: fee / 100 },
    ];
    return list.map((s) => ({ ...s, r: futureValue({ start, monthly, annualRate: s.rate, years, annualFee: s.fee }) }));
  }, [start, monthly, years, deposit, bond, stocks, fee]);

  const series = scenarios.flatMap((s) => s.r.yearly.map((y) => ({ name: s.name, year: y.year, value: y.value })));
  const contributed = scenarios[0].r.contributed;

  return (
    <CalcLayout
      form={
        <>
          <Field label="Начална сума"><NumInput value={start} onChange={setStart} step={100} suffix="€" /></Field>
          <Field label="Месечна вноска"><NumInput value={monthly} onChange={setMonthly} step={10} suffix="€" /></Field>
          <Field label="Години"><NumInput value={years} onChange={setYears} min={1} max={60} suffix="години" /></Field>
          <p className="text-sm font-semibold pt-2">Годишна доходност (допускания)</p>
          <Field label="Депозит" hint="Средно за нови срочни депозити, юни 2026 (БНБ)."><NumInput value={deposit} onChange={setDeposit} step={0.1} suffix="%" /></Field>
          <Field label="Облигации"><NumInput value={bond} onChange={setBond} step={0.5} suffix="%" /></Field>
          <Field label="Акции (широк индекс)" hint="Историческа средна стойност в дълъг период, не обещание. Има години с −30% и повече."><NumInput value={stocks} onChange={setStocks} step={0.5} suffix="%" /></Field>
          <Field label="Годишна такса на фонда"><NumInput value={fee} onChange={setFee} step={0.1} suffix="%" /></Field>
          <Field label="Инфлация (за реалната стойност)"><NumInput value={inflation} onChange={setInflation} step={0.5} suffix="%" /></Field>
        </>
      }
      result={
        <div aria-live="polite">
          <p className="text-sm text-muted">Ще вложите общо</p>
          <p className="display num text-[3.4rem] mt-1">{eur(contributed, 0)}</p>
          <div className="mt-6"><GrowthChart series={series} /></div>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-[15px] num">
              <thead>
                <tr className="text-left border-b border-ink">
                  <th className="py-2 font-semibold">След {years} г.</th><th className="font-semibold">Номинално</th><th className="font-semibold">В днешни пари</th><th className="font-semibold">Печалба</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s) => (
                  <tr key={s.name} className="border-b border-rule">
                    <td className="py-2">{s.name}{s.rate ? <span className="text-muted text-xs"> {num(s.rate * 100)}%</span> : null}</td>
                    <td>{eur(s.r.value, 0)}</td>
                    <td>{eur(realValue(s.r.value, inflation / 100, years), 0)}</td>
                    <td className={s.r.value - contributed < 0 ? "text-red" : ""}>{eur(s.r.value - contributed, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-[15px]">
            „В днешни пари“ показва какво ще можете да купите с тази сума при инфлация {num(inflation)}% годишно.
            Парите без лихва губят покупателна сила всяка година.
          </p>
          <Sources items={[{ label: "Лихва по срочни депозити", p: P.depositRate }, { label: "Инфлация", p: P.cpiYoY }]} />
          <Disclaimer>Това не е инвестиционен съвет. Доходността в миналото не гарантира бъдеща. Данъците върху дохода от инвестиции не са включени.</Disclaimer>
        </div>
      }
    />
  );
}
