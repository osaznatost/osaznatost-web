"use client";

import { useMemo, useState } from "react";
import { CalcLayout, NumInput, Segmented } from "@/components/CalcLayout";
import { Disclaimer, Field, Row, Sources, eur, num, pct } from "@/components/ui";
import { grossFromNet, salary, vatIncluded } from "@/lib/calc";
import { P } from "@/lib/params";

const sp = {
  employeeRate: P.employeeRate.value,
  employerRate: P.employerRate.value,
  incomeTax: P.incomeTax.value,
  maxInsurable: P.maxInsurable.value,
};

export function Taxes() {
  const [mode, setMode] = useState<"gross" | "net">("gross");
  const [amount, setAmount] = useState(1500);
  const [spendShare, setSpendShare] = useState(70);
  const [reducedShare, setReducedShare] = useState(5);
  const [petrol, setPetrol] = useState(60);
  const [diesel, setDiesel] = useState(0);
  const [fuelPrice, setFuelPrice] = useState(1.35);

  const r = useMemo(() => {
    const gross = mode === "gross" ? amount : grossFromNet(amount, sp);
    const s = salary(gross, sp);
    const spend = (s.net * spendShare) / 100;
    const fuelSpend = (petrol + diesel) * fuelPrice;
    const otherSpend = Math.max(0, spend - fuelSpend);
    const reduced = (otherSpend * reducedShare) / 100;
    const standard = otherSpend - reduced;
    const vatGoods = vatIncluded(standard, P.vatStd.value) + vatIncluded(reduced, P.vatReduced.value);
    const vatFuel = vatIncluded(fuelSpend, P.vatStd.value);
    const excise = petrol * P.excisePetrol.value + diesel * P.exciseDiesel.value;
    const toState = s.employeeContrib + s.tax + s.employerContrib + vatGoods + vatFuel + excise;
    return { s, spend, fuelSpend, vatGoods, vatFuel, excise, toState };
  }, [mode, amount, spendShare, reducedShare, petrol, diesel, fuelPrice]);

  const { s } = r;
  const per100 = (s.net / s.laborCost) * 100;

  return (
    <CalcLayout
      form={
        <>
          <Field label="Заплата по трудов договор">
            <div className="space-y-2">
              <Segmented value={mode} onChange={setMode} options={[{ value: "gross", label: "Знам брутото" }, { value: "net", label: "Знам нетото" }]} />
              <NumInput value={amount} onChange={setAmount} step={50} suffix="€ на месец" />
            </div>
          </Field>
          <Field label="Каква част от нетото харчите" hint="Останалото е за спестяване, наем на частно лице, кредит и др., където няма ДДС.">
            <NumInput value={spendShare} onChange={setSpendShare} min={0} max={100} suffix="%" />
          </Field>
          <Field label="От харченето: дял със ставка 9%" hint="Хотели, бебешки храни и пелени, книги.">
            <NumInput value={reducedShare} onChange={setReducedShare} min={0} max={100} suffix="%" />
          </Field>
          <Field label="Бензин на месец"><NumInput value={petrol} onChange={setPetrol} step={5} suffix="литра" /></Field>
          <Field label="Дизел на месец"><NumInput value={diesel} onChange={setDiesel} step={5} suffix="литра" /></Field>
          <Field label="Цена на горивото"><NumInput value={fuelPrice} onChange={setFuelPrice} step={0.01} suffix="€/л" /></Field>
        </>
      }
      result={
        <div aria-live="polite">
          <p className="text-sm text-muted">От всеки 100 €, които струва трудът ви на работодателя, до вас стигат</p>
          <p className="num text-5xl font-bold tracking-tight">{num(per100, 1)} €</p>

          <h2 className="font-bold text-lg mt-8">Заплата</h2>
          <Row label="Цена на труда за работодателя" value={eur(s.laborCost)} />
          <Row label="Осигуровки, платени от работодателя" value={eur(s.employerContrib)} />
          <Row label="Брутна заплата" value={eur(s.gross)} />
          <Row label={`Осигуровки, удържани от вас (${pct(sp.employeeRate, 2)})`} value={`− ${eur(s.employeeContrib)}`} />
          <Row label="Данък общ доход (10%)" value={`− ${eur(s.tax)}`} />
          <Row label="Нетна заплата" value={eur(s.net)} strong />
          {s.gross > sp.maxInsurable && (
            <p className="text-sm text-muted mt-2">Осигуровките се плащат до {eur(sp.maxInsurable, 0)} осигурителен доход. Над тази сума се плаща само данък.</p>
          )}

          <h2 className="font-bold text-lg mt-8">Когато харчите</h2>
          <Row label="Харчите на месец" value={eur(r.spend)} />
          <Row label="ДДС в покупките" value={eur(r.vatGoods)} />
          <Row label="ДДС в горивото" value={eur(r.vatFuel)} />
          <Row label="Акциз в горивото" value={eur(r.excise)} />
          {r.fuelSpend > 0 && (
            <p className="text-sm text-muted mt-2">
              От {eur(r.fuelSpend)} за гориво {eur(r.vatFuel + r.excise)} ({pct((r.vatFuel + r.excise) / r.fuelSpend)}) са данъци.
            </p>
          )}

          <h2 className="font-bold text-lg mt-8">Общо към държавата на месец</h2>
          <Row label="Осигуровки, данък, ДДС и акциз" value={eur(r.toState)} strong />
          <Row label="Като дял от цената на труда" value={pct(r.toState / s.laborCost)} />
          <p className="text-sm text-muted mt-3">
            Не са включени местните данъци (имот, кола, такса смет), акцизите върху алкохол, тютюн и ток, както и таксите. Ще ги добавим.
          </p>

          <Sources items={[
            { label: "Осигуровки, работник", p: P.employeeRate },
            { label: "Осигуровки, работодател", p: P.employerRate },
            { label: "Максимален осигурителен доход", p: P.maxInsurable },
            { label: "Данък общ доход", p: P.incomeTax },
            { label: "ДДС", p: P.vatStd },
            { label: "ДДС, намалена ставка", p: P.vatReduced },
            { label: "Акциз бензин", p: P.excisePetrol },
            { label: "Акциз дизел", p: P.exciseDiesel },
          ]} />
          <Disclaimer>Изчислението е за трудов договор, III категория труд, роден след 1959 г. Не е данъчен съвет.</Disclaimer>
        </div>
      }
    />
  );
}
