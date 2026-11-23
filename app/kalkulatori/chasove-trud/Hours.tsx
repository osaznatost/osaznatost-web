"use client";

import { useMemo, useState } from "react";
import { CalcLayout, NumInput } from "@/components/CalcLayout";
import { Disclaimer, Field, Sources, eur } from "@/components/ui";
import { salary } from "@/lib/calc";
import { P } from "@/lib/params";

const HOURS_PER_MONTH = 168;
const fmtTime = (h: number) => h < 1 ? `${Math.max(1, Math.round(h * 60))} мин.` : h < 24 ? `${Math.floor(h)} ч. ${Math.round((h % 1) * 60)} мин.` : `${(h / 8).toLocaleString("bg-BG", { maximumFractionDigits: 1 })} работни дни`;

/** Колко време трябва да работите, за да си купите нещо: цените от магазините делим на нетната ви заплата на час. */
export function Hours({ items, date }: { items: { name: string; price: number }[]; date: string }) {
  const [gross, setGross] = useState(1500);
  const [custom, setCustom] = useState(800);
  const [customName, setCustomName] = useState("Нов телефон");
  const net = salary(gross, { employeeRate: P.employeeRate.value, employerRate: P.employerRate.value, incomeTax: P.incomeTax.value, maxInsurable: P.maxInsurable.value }).net;
  const perHour = net / HOURS_PER_MONTH;
  const minNet = salary(P.minWage.value, { employeeRate: P.employeeRate.value, employerRate: P.employerRate.value, incomeTax: P.incomeTax.value, maxInsurable: P.maxInsurable.value }).net / HOURS_PER_MONTH;
  const rows = useMemo(() => items.map((x) => ({ ...x, h: x.price / perHour, hMin: x.price / minNet })), [items, perHour, minNet]);

  return (
    <CalcLayout
      form={
        <>
          <Field label="Вашата бруто заплата" hint="Пълно работно време, 168 часа месечно."><NumInput value={gross} onChange={setGross} step={50} suffix="€/месец" /></Field>
          <p className="text-[15px]">Изкарвате нето <b>{eur(perHour)}</b> на час (при минимална заплата: {eur(minNet)}).</p>
          <p className="text-sm font-semibold pt-2">Сметнете нещо свое</p>
          <Field label="Какво"><input value={customName} onChange={(e) => setCustomName(e.target.value)} /></Field>
          <Field label="Цена"><NumInput value={custom} onChange={setCustom} step={10} suffix="€" /></Field>
        </>
      }
      result={
        <div aria-live="polite">
          <p className="text-sm text-muted">{customName || "Покупката"} ви струва</p>
          <p className="display num text-[3rem] mt-1">{fmtTime(custom / perHour)}</p>
          <p className="text-[15px] mt-1">работа. На минимална заплата: {fmtTime(custom / minNet)}.</p>
          <p className="font-semibold mt-6 mb-2">Основни стоки (типична цена в магазините)</p>
          <table className="w-full text-[15px] num">
            <thead><tr className="text-left text-sm text-muted border-b border-rule"><th className="py-1 font-normal">Стока</th><th className="font-normal text-right">Цена</th><th className="font-normal text-right">Вие</th><th className="font-normal text-right">Мин. заплата</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.name} className="border-b border-rule"><td className="py-1 pr-2">{r.name}</td><td className="text-right">{eur(r.price)}</td><td className="text-right">{fmtTime(r.h)}</td><td className="text-right text-muted">{fmtTime(r.hMin)}</td></tr>
            ))}</tbody>
          </table>
          <Sources items={[{ label: "Минимална заплата", p: P.minWage }, { label: "Осигуровки на работника", p: P.employeeRate }]} />
          <Disclaimer>Цените са типичните (медианни) от „Колко струва“ на КЗП към {date.split("-").reverse().join(".")}. Часовете са нетни: след осигуровки и данък.</Disclaimer>
        </div>
      }
    />
  );
}
