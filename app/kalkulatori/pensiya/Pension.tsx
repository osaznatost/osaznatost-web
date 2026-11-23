"use client";

import { useState } from "react";
import { CalcLayout, NumInput, Segmented } from "@/components/CalcLayout";
import { Disclaimer, Field, Sources, eur } from "@/components/ui";
import { P } from "@/lib/params";

/**
 * Ориентировъчна пенсия от НОИ: доход × години стаж × 1,35%.
 * Опростяване: приемаме, че средният ви бруто доход (в днешни пари) спрямо средния за страната е същият като през цялата кариера,
 * т.е. индивидуалният коефициент × средния осигурителен доход ≈ вашият среден бруто доход днес (до тавана).
 */
export function Pension() {
  const [gross, setGross] = useState(1500);
  const [years, setYears] = useState(38);
  const [ufp, setUfp] = useState<"yes" | "no">("yes");
  const [ufpYears, setUfpYears] = useState(24);

  const base = Math.min(gross, P.maxInsurable.value);
  const pct = years * P.pensionPerYear.value;
  // Вноската за универсален фонд (5 от 19,8 пр.п. за пенсии) намалява пенсията от НОИ пропорционално за тези години
  const ufpShare = ufp === "yes" ? Math.min(ufpYears, years) / Math.max(years, 1) : 0;
  const reduction = ufpShare * (5 / 19.8);
  const raw = base * pct * (1 - reduction);
  const pension = Math.min(Math.max(raw, P.minPension.value), P.maxPension.value);
  const net = base * (1 - P.employeeRate.value) * (1 - P.incomeTax.value);
  const replacement = pension / net;

  return (
    <CalcLayout
      form={
        <>
          <Field label="Средна бруто заплата през кариерата, в днешни пари" hint="Ако цял живот сте взимали около средната заплата, въведете днешната средна. Над тавана за осигуряване не се брои.">
            <NumInput value={gross} onChange={setGross} step={50} suffix="€/месец" />
          </Field>
          <Field label="Години осигурителен стаж" hint="За пенсия през 2026 г. са нужни 39 г. и 10 м. за мъжете и 36 г. и 10 м. за жените (или 15 г. при по-късна възраст).">
            <NumInput value={years} onChange={setYears} min={1} max={50} suffix="години" />
          </Field>
          <Field label="Осигурявате ли се и в универсален пенсионен фонд?" hint="Всички, родени след 1959 г., освен ако не сте прехвърлили вноските в НОИ.">
            <Segmented value={ufp} onChange={setUfp} options={[{ value: "yes", label: "Да" }, { value: "no", label: "Не" }]} />
          </Field>
          {ufp === "yes" && (
            <Field label="Години с вноски в универсалния фонд" hint="Фондовете работят от 2002 г.">
              <NumInput value={ufpYears} onChange={setUfpYears} min={0} max={years} suffix="години" />
            </Field>
          )}
        </>
      }
      result={
        <div aria-live="polite">
          <p className="text-sm text-muted">Пенсия от НОИ, в днешни пари</p>
          <p className="display num text-[3.4rem] mt-1">{eur(pension, 0)}</p>
          <p className="text-[15px] mt-2">Това е около <b>{Math.round(replacement * 100)}%</b> от сегашната ви нетна заплата ({eur(net, 0)}).</p>
          <ul className="text-[15px] mt-4 space-y-1.5">
            <li>{years} г. × {(P.pensionPerYear.value * 100).toLocaleString("bg-BG")}% = <b>{(pct * 100).toLocaleString("bg-BG", { maximumFractionDigits: 1 })}%</b> от осигурителния доход ({eur(base, 0)})</li>
            {reduction > 0 && <li>Намаление заради вноските в универсален фонд: <b>−{(reduction * 100).toLocaleString("bg-BG", { maximumFractionDigits: 1 })}%</b>. Срещу това ще получавате и втора пенсия от фонда, която тук не смятаме.</li>}
            {raw < P.minPension.value && <li>Сметката дава по-малко от минималната пенсия, затова се изплаща минималната: {eur(P.minPension.value)}.</li>}
            {raw > P.maxPension.value && <li>Сметката дава повече от тавана, затова се изплаща максималната пенсия: {eur(P.maxPension.value)}.</li>}
          </ul>
          <Sources items={[
            { label: "Процент за година стаж", p: P.pensionPerYear },
            { label: "Минимална пенсия", p: P.minPension },
            { label: "Максимална пенсия", p: P.maxPension },
            { label: "Максимален осигурителен доход", p: P.maxInsurable },
          ]} />
          <Disclaimer>Ориентировъчно. Истинската пенсия зависи от индивидуалния коефициент (заплатата ви спрямо средната за страната за всяка година), от стажа при първа и втора категория и от датата на пенсиониране. Точна справка дава НОИ с ПИК.</Disclaimer>
        </div>
      }
    />
  );
}
