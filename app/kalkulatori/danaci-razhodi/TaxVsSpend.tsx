"use client";
import { useState } from "react";

type Tax = { id: string; name: string; rate: number; eur: number; note: string };
type Spend = { name: string; eur: number };
const bn = (x: number) => `${(x / 1e9).toLocaleString("bg-BG", { maximumFractionDigits: 2 })} млрд. €`;
const mn = (x: number) => Math.abs(x) >= 1e9 ? bn(x) : `${Math.round(x / 1e6).toLocaleString("bg-BG")} млн. €`;

export function TaxVsSpend({ taxes, spend, year }: { taxes: Tax[]; spend: Spend[]; year: number }) {
  const [id, setId] = useState(taxes[0].id);
  const t = taxes.find((x) => x.id === id) ?? taxes[0];
  const [rate, setRate] = useState<Record<string, number>>(Object.fromEntries(taxes.map((x) => [x.id, x.rate + 1])));
  const r = rate[t.id];
  const delta = t.eur * (r / t.rate - 1);
  const up = delta > 0;
  return (
    <div className="max-w-3xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-[15px]">
          <span className="block font-semibold mb-1">Данък</span>
          <select value={id} onChange={(e) => setId(e.target.value)} className="w-full border border-rule rounded-sm px-3 py-2 bg-white">
            {taxes.map((x) => <option key={x.id} value={x.id}>{x.name} (сега {x.rate}%)</option>)}
          </select>
        </label>
        <label className="block text-[15px]">
          <span className="block font-semibold mb-1">Нова ставка: {r}%</span>
          <input type="range" min={0} max={Math.max(30, t.rate * 2)} step={1} value={r}
            onChange={(e) => setRate({ ...rate, [t.id]: Number(e.target.value) })} className="w-full" aria-label="Нова ставка в проценти" />
        </label>
      </div>
      <div className="bg-surface rounded-sm p-4 mt-5">
        <p className="text-sm text-muted">Приходи от този данък в държавния бюджет за {year} г.: {bn(t.eur)}</p>
        <p className="text-lg mt-1">
          {r === t.rate ? "Без промяна." : <>При ставка {r}% вместо {t.rate}%: <b className="num">{mn(Math.abs(delta))}</b> на година {up ? "повече" : "по-малко"} (статична оценка).</>}
        </p>
        {t.note && <p className="text-sm text-muted mt-1">{t.note}</p>}
      </div>
      {r !== t.rate && (
        <section className="mt-6">
          <h2 className="text-lg font-bold mb-1">{up ? "Същата сума, ако вместо това се намалят разходи" : "Откъде може да дойде липсващата сума"}</h2>
          <p className="text-[15px] text-muted mb-3">С колко процента трябва да се намали всеки от тези разходи, за да се получат {mn(Math.abs(delta))}.</p>
          <ul className="divide-y divide-rule border-y border-rule text-[15px]">
            {spend.map((s) => {
              const pct = (Math.abs(delta) / s.eur) * 100;
              return (
                <li key={s.name} className="py-2 flex justify-between gap-3">
                  <span>{s.name} <span className="text-muted text-sm">({mn(s.eur)})</span></span>
                  <b className="num whitespace-nowrap">{pct > 100 ? "не стига" : `−${pct.toLocaleString("bg-BG", { maximumFractionDigits: 1 })}%`}</b>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
