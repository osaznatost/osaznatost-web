"use client";

import { useMemo, useState } from "react";
import { CalcLayout, NumInput } from "@/components/CalcLayout";
import { Disclaimer, Field, Row, Sources, eur, num } from "@/components/ui";
import { grossFromNet, salary } from "@/lib/calc";
import { P } from "@/lib/params";

const sp = {
  employeeRate: P.employeeRate.value,
  employerRate: P.employerRate.value,
  incomeTax: P.incomeTax.value,
  maxInsurable: P.maxInsurable.value,
};

const items = [
  { id: "housing", label: "Наем или вноска по кредит", v: 500 },
  { id: "utilities", label: "Ток, вода, отопление, вход", v: 150 },
  { id: "food", label: "Храна и домакински стоки", v: 450 },
  { id: "transport", label: "Транспорт и гориво", v: 150 },
  { id: "phone", label: "Телефон и интернет", v: 40 },
  { id: "health", label: "Здраве и лекарства", v: 50 },
  { id: "kids", label: "Деца (детска градина, занимания)", v: 0 },
  { id: "fun", label: "Ресторанти, развлечения, спорт", v: 200 },
  { id: "clothes", label: "Облекло", v: 60 },
  { id: "travel", label: "Почивки (разпределени по месеци)", v: 100 },
  { id: "other", label: "Други", v: 80 },
];

export function Income() {
  const [b, setB] = useState<Record<string, number>>(Object.fromEntries(items.map((i) => [i.id, i.v])));
  const [save, setSave] = useState(10);
  const [earners, setEarners] = useState(1);
  const [age, setAge] = useState(30);
  const [retireAge, setRetireAge] = useState(65);
  const [pensionWanted, setPensionWanted] = useState(1200);
  const [statePension, setStatePension] = useState(600);
  const [ret, setRet] = useState(5);

  const r = useMemo(() => {
    const costs = Object.values(b).reduce((s, v) => s + v, 0);
    const netHousehold = costs / (1 - save / 100);
    const netEach = netHousehold / Math.max(1, earners);
    const grossEach = grossFromNet(netEach, sp);
    const s = salary(grossEach, sp);
    const gap = Math.max(0, pensionWanted - statePension);
    const capital = (gap * 12) / 0.04; // правило на 4%
    const months = Math.max(1, (retireAge - age) * 12);
    const rm = ret / 100 / 12;
    const monthlyNeeded = rm === 0 ? capital / months : (capital * rm) / (Math.pow(1 + rm, months) - 1);
    return { costs, netHousehold, netEach, grossEach, laborCost: s.laborCost, gap, capital, monthlyNeeded };
  }, [b, save, earners, age, retireAge, pensionWanted, statePension, ret]);

  return (
    <CalcLayout
      form={
        <>
          <p className="text-sm text-muted">Стойностите по подразбиране са само пример. Сменете ги с вашите реални разходи на месец за цялото домакинство.</p>
          <div className="divide-y divide-rule">
            {items.map((i) => (
              <div key={i.id} className="grid grid-cols-[1fr_8.5rem] gap-3 items-center py-2">
                <span className="text-[15px]">{i.label}</span>
                <NumInput value={b[i.id]} onChange={(v) => setB({ ...b, [i.id]: v })} step={10} suffix="€" />
              </div>
            ))}
          </div>
          <Field label="Колко искате да спестявате от нетния доход"><NumInput value={save} onChange={setSave} min={0} max={90} suffix="%" /></Field>
          <Field label="Колко души в домакинството работят"><NumInput value={earners} onChange={setEarners} min={1} max={6} /></Field>
          <p className="text-sm font-semibold pt-4">Пенсия</p>
          <Field label="Възраст сега"><NumInput value={age} onChange={setAge} min={16} max={80} suffix="г." /></Field>
          <Field label="Възраст на пенсиониране"><NumInput value={retireAge} onChange={setRetireAge} min={40} max={80} suffix="г." /></Field>
          <Field label="Желан месечен доход в пенсия (днешни пари)"><NumInput value={pensionWanted} onChange={setPensionWanted} step={50} suffix="€" /></Field>
          <Field label="Очаквана държавна пенсия (днешни пари)" hint="Вашата прогноза можете да видите в личния профил в НОИ."><NumInput value={statePension} onChange={setStatePension} step={50} suffix="€" /></Field>
          <Field label="Реална доходност на спестяванията (над инфлацията)"><NumInput value={ret} onChange={setRet} step={0.5} suffix="%" /></Field>
        </>
      }
      result={
        <div aria-live="polite">
          <p className="text-sm text-muted">Нужна нетна заплата{earners > 1 ? " на човек" : ""}</p>
          <p className="num text-5xl font-bold tracking-tight">{eur(r.netEach, 0)}</p>
          <p className="mt-1">Това е бруто <span className="num font-semibold">{eur(r.grossEach, 0)}</span> по трудов договор. За работодателя струва <span className="num">{eur(r.laborCost, 0)}</span>.</p>

          <div className="mt-6">
            <Row label="Разходи на домакинството на месец" value={eur(r.costs, 0)} />
            <Row label={`Плюс спестяване ${num(save, 0)}%`} value={eur(r.netHousehold - r.costs, 0)} />
            <Row label="Нужен нетен доход на домакинството" value={eur(r.netHousehold, 0)} strong />
            <Row label="Спрямо минималната заплата (бруто)" value={`${num(r.grossEach / P.minWage.value, 1)} пъти`} />
          </div>

          <h2 className="font-bold text-lg mt-8">За пенсията</h2>
          {r.gap === 0 ? (
            <p>Очакваната държавна пенсия покрива желания доход.</p>
          ) : (
            <>
              <Row label="Липсва ви на месец в пенсия" value={eur(r.gap, 0)} />
              <Row label="Нужен капитал (правило на 4% теглене годишно)" value={eur(r.capital, 0)} />
              <Row label="Нужна месечна вноска от днес" value={eur(r.monthlyNeeded, 0)} strong />
              <p className="text-sm text-muted mt-2">
                Всичко е в днешни пари, затова доходността е над инфлацията. Правилото на 4% е опростено допускане от изследвания върху американски пазари.
              </p>
            </>
          )}
          <Sources items={[
            { label: "Осигуровки, работник", p: P.employeeRate },
            { label: "Данък общ доход", p: P.incomeTax },
            { label: "Минимална заплата", p: P.minWage },
          ]} />
          <Disclaimer>Скоро ще добавим средни разходи и наеми по градове от НСИ, за да имате база за сравнение.</Disclaimer>
        </div>
      }
    />
  );
}
