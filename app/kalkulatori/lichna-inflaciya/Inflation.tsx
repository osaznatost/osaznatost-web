"use client";

import { useMemo, useState } from "react";
import { CalcLayout, NumInput } from "@/components/CalcLayout";
import { Disclaimer, Row, eur, num } from "@/components/ui";
import { personalInflation } from "@/lib/calc";
import { CPI_GROUPS, CPI_GROUPS_SOURCE, CPI_GROUPS_PERIOD, P, monthLabel } from "@/lib/params";

const defaults: Record<string, number> = {
  food: 400, alc: 0, clothing: 60, housing: 200, furnishing: 40, health: 50, transport: 200,
  communication: 40, recreation: 60, education: 0, restaurants: 120, insurance: 20, personal: 50,
};

export function Inflation() {
  const [spend, setSpend] = useState<Record<string, number>>(defaults);
  const [raise, setRaise] = useState(0);
  const rates = useMemo(() => Object.fromEntries(CPI_GROUPS.map((g) => [g.id, g.rate])), []);
  const r = useMemo(() => personalInflation(spend, rates), [spend, rates]);
  const official = P.cpiYoY.value * 100;
  const extraYear = (r.total * 12 * r.rate) / (100 + r.rate);
  const label = (id: string) => CPI_GROUPS.find((g) => g.id === id)!.label;

  return (
    <CalcLayout
      form={
        <>
          <p className="text-sm text-muted">Въведете приблизително колко харчите на месец за всяка група. Оставете 0, ако нямате такъв разход.</p>
          <div className="divide-y divide-rule">
            {CPI_GROUPS.map((g) => (
              <div key={g.id} className="grid grid-cols-[1fr_8.5rem] gap-3 items-center py-2">
                <span className="text-[15px]">
                  {g.label}
                  <span className="block text-xs text-muted num">{g.rate > 0 ? "+" : ""}{num(g.rate)}% за година</span>
                </span>
                <NumInput value={spend[g.id] ?? 0} onChange={(v) => setSpend({ ...spend, [g.id]: v })} step={10} suffix="€" />
              </div>
            ))}
          </div>
          <div className="pt-2">
            <span className="block text-sm font-semibold mb-1">С колко се е вдигнал доходът ви за последната година?</span>
            <NumInput value={raise} onChange={setRaise} step={0.5} min={-100} suffix="%" />
          </div>
        </>
      }
      result={
        <div aria-live="polite">
          <p className="text-sm text-muted">Вашата инфлация</p>
          <p className="display num text-[4.2rem] mt-1">{num(r.rate)}%</p>
          <p className="mt-2">
            Официалната (НСИ, {monthLabel(CPI_GROUPS_PERIOD)}) е <span className="num font-semibold">{num(official)}%</span>.{" "}
            {Math.abs(r.rate - official) < 0.3
              ? "Вашата е почти същата."
              : r.rate > official
                ? `Вашата е с ${num(r.rate - official)} пр.п. по-висока, защото харчите повече за неща, които поскъпват по-бързо от средното.`
                : `Вашата е с ${num(official - r.rate)} пр.п. по-ниска, защото харчите повече за неща, които поскъпват по-бавно.`}
          </p>

          <div className="mt-6">
            <Row label="Месечни разходи" value={eur(r.total, 0)} />
            <Row label="Колко повече плащате за година за същото потребление" value={eur(extraYear, 0)} />
            {raise !== 0 && (
              <Row
                label="Реално изменение на доходите ви"
                value={`${raise - r.rate >= 0 ? "+" : ""}${num(((1 + raise / 100) / (1 + r.rate / 100) - 1) * 100)}%`}
                strong
              />
            )}
          </div>

          <h2 className="display text-[1.8rem] mt-8 mb-2">Какво движи вашата инфлация</h2>
          <div className="space-y-2">
            {r.contributions.slice(0, 6).map((c) => {
              const w = Math.max(2, (Math.abs(c.contribution) / Math.max(...r.contributions.map((x) => Math.abs(x.contribution)), 0.01)) * 100);
              return (
                <div key={c.id}>
                  <div className="flex justify-between text-sm"><span>{label(c.id)}</span><span className="num">{num(c.contribution, 2)} пр.п.</span></div>
                  <div className="h-2 bg-surface"><div className="h-2" style={{ width: `${w}%`, background: c.contribution >= 0 ? "#3d5a80" : "#8a8f8c" }} /></div>
                </div>
              );
            })}
          </div>

          <details className="mt-6 text-sm text-muted border-t border-rule pt-3">
            <summary className="cursor-pointer text-ink">Как смятаме</summary>
            <p className="mt-2">
              Всяка група разходи тежи толкова, колкото е делът ѝ в бюджета ви. Умножаваме този дял по годишната инфлация на групата по данни на НСИ и сумираме.
              Източник: <a href={CPI_GROUPS_SOURCE.url} target="_blank" rel="noreferrer">{CPI_GROUPS_SOURCE.title}</a>.
            </p>
          </details>
          <Disclaimer>Изчислението е ориентировъчно. Цените в различните магазини и градове се различават от средните за страната.</Disclaimer>
        </div>
      }
    />
  );
}
