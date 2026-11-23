"use client";

import { useState } from "react";
import { CalcLayout, NumInput, Segmented } from "@/components/CalcLayout";
import { Disclaimer, Field, Sources, eur } from "@/components/ui";
import { salary } from "@/lib/calc";
import { P } from "@/lib/params";

const WD_PER_MONTH = 21.5; // средно работни дни в месеца

/** Майчинство (410 дни + втората година) и болничен: колко ще получите спрямо заплатата си. */
export function Benefits() {
  const [kind, setKind] = useState<"maternity" | "sick">("maternity");
  const [gross, setGross] = useState(1500);
  const [days, setDays] = useState(10);

  const p = { employeeRate: P.employeeRate.value, employerRate: P.employerRate.value, incomeTax: P.incomeTax.value, maxInsurable: P.maxInsurable.value };
  const s = salary(gross, p);
  const base = Math.min(gross, P.maxInsurable.value);
  const dailyBase = base / WD_PER_MONTH, dailyNet = s.net / WD_PER_MONTH;

  // Майчинство: 90% от среднодневния бруто доход, но не повече от среднодневното нето; обезщетенията не се облагат
  const matDaily = Math.min(dailyBase * P.maternityRate.value, dailyNet);
  const matMonth = matDaily * WD_PER_MONTH;
  const matTotal = matDaily * 410 * (WD_PER_MONTH * 12 / 365);
  const year2 = P.childBenefit2.value;

  // Болничен: първите 3 работни дни работодателят (70% от бруто, облага се като заплата), от 4-ия ден НОИ (80%, до нетото)
  const empDays = Math.min(days, 3), noiDays = Math.max(0, days - 3);
  const empGross = (gross / WD_PER_MONTH) * P.sickEmployerRate.value * empDays;
  const empNet = empGross * (s.net / gross);
  const noiDaily = Math.min(dailyBase * P.sickNoiRate.value, dailyNet);
  const sickTotal = empNet + noiDaily * noiDays;
  const lost = dailyNet * days - sickTotal;

  return (
    <CalcLayout
      form={
        <>
          <Segmented value={kind} onChange={setKind} options={[{ value: "maternity", label: "Майчинство" }, { value: "sick", label: "Болничен" }]} />
          <Field label="Бруто заплата" hint={kind === "maternity" ? "Средно за последните 24 месеца." : "Средно за последните 18 месеца."}>
            <NumInput value={gross} onChange={setGross} step={50} suffix="€/месец" />
          </Field>
          {kind === "sick" && <Field label="Работни дни в болничен"><NumInput value={days} onChange={setDays} min={1} max={60} suffix="дни" /></Field>}
        </>
      }
      result={
        <div aria-live="polite">
          {kind === "maternity" ? (
            <>
              <p className="text-sm text-muted">Първите 410 дни (около 13,5 месеца), на месец</p>
              <p className="display num text-[3.4rem] mt-1">{eur(matMonth, 0)}</p>
              <p className="text-[15px] mt-2">Сега взимате нето {eur(s.net, 0)}. Обезщетението е 90% от брутото, но не повече от нетото, и не се облага с данък.</p>
              <p className="text-[15px] mt-4">Общо за 410-те дни: <b>{eur(matTotal, 0)}</b>.</p>
              <p className="text-[15px] mt-1">Втората година (до 2 години на детето): <b>{eur(year2)}</b> на месец, еднакво за всички. Ако се върнете на работа, получавате част от тази сума.</p>
              <Sources items={[{ label: "Майчинство", p: P.maternityRate }, { label: "Втората година", p: P.childBenefit2 }, { label: "Максимален осигурителен доход", p: P.maxInsurable }]} />
            </>
          ) : (
            <>
              <p className="text-sm text-muted">За {days} работни дни ще получите</p>
              <p className="display num text-[3.4rem] mt-1">{eur(sickTotal, 0)}</p>
              <ul className="text-[15px] mt-3 space-y-1.5">
                <li>От работодателя за първите {empDays} дни (70%): {eur(empNet, 0)} нето</li>
                {noiDays > 0 && <li>От НОИ за следващите {noiDays} дни (80%): {eur(noiDaily * noiDays, 0)}</li>}
                <li>Губите спрямо нормалната заплата: <b>{eur(lost, 0)}</b></li>
              </ul>
              <Sources items={[{ label: "Първите 3 дни", p: P.sickEmployerRate }, { label: "От 4-ия ден", p: P.sickNoiRate }]} />
            </>
          )}
          <Disclaimer>Ориентировъчно, при пълни месеци работа и 21,5 работни дни средно в месеца. Нужен е поне 12 месеца осигурителен стаж (за болничен от общо заболяване: 6 месеца). Точния размер изчислява НОИ.</Disclaimer>
        </div>
      }
    />
  );
}
