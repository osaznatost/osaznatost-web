"use client";

import { useMemo, useState } from "react";
import { CalcLayout, NumInput } from "@/components/CalcLayout";
import { Disclaimer, Field, Sources, eur } from "@/components/ui";
import { annuityPayment } from "@/lib/calc";
import { P } from "@/lib/params";

/**
 * Наем или покупка: сравняваме нетното богатство след N години в двата случая.
 * Купувач: самоучастие + кредит, плаща вноска, такси и поддръжка; жилището поскъпва.
 * Наемател: инвестира самоучастието и разликата между разходите на купувача и наема.
 */
export function RentBuy() {
  const [price, setPrice] = useState(150000);
  const [down, setDown] = useState(15);
  const [rate, setRate] = useState(+(P.mortgageRate.value * 100).toFixed(2));
  const [term, setTerm] = useState(30);
  const [rent, setRent] = useState(650);
  const [years, setYears] = useState(15);
  const [growth, setGrowth] = useState(4);
  const [rentGrowth, setRentGrowth] = useState(4);
  const [ret, setRet] = useState(5);
  const [upkeep, setUpkeep] = useState(1);

  const r = useMemo(() => {
    const downAmt = price * down / 100, fees = price * 0.03; // нотариални такси, данък, комисиона: около 3%
    const loan = price - downAmt;
    const pay = annuityPayment(loan, rate / 100, term * 12);
    let bal = loan, home = price, rentNow = rent, invest = downAmt + fees, paidRent = 0, paidInterest = 0;
    for (let m = 1; m <= years * 12; m++) {
      const interest = bal * rate / 100 / 12;
      const principal = bal > 0 ? Math.min(pay - interest, bal) : 0;
      const loanPay = bal > 0 ? interest + principal : 0;
      if (bal > 0) paidInterest += interest;
      bal = Math.max(0, bal - principal);
      const ownerCost = loanPay + home * upkeep / 100 / 12;
      // наемателят влага разликата (ако е положителна) с доходността на инвестицията
      invest = invest * (1 + ret / 100 / 12) + (ownerCost - rentNow);
      paidRent += rentNow;
      if (m % 12 === 0) { home *= 1 + growth / 100; rentNow *= 1 + rentGrowth / 100; }
    }
    const buyerWealth = home - bal;
    return { pay, downAmt, fees, buyerWealth, renterWealth: invest, paidRent, paidInterest, bal, home };
  }, [price, down, rate, term, rent, years, growth, rentGrowth, ret, upkeep]);

  const better = r.buyerWealth >= r.renterWealth ? "покупката" : "наемът";

  return (
    <CalcLayout
      form={
        <>
          <Field label="Цена на жилището"><NumInput value={price} onChange={setPrice} step={5000} suffix="€" /></Field>
          <Field label="Самоучастие" hint={`БНБ изисква поне ${Math.round((1 - P.maxLtv.value) * 100)}%.`}><NumInput value={down} onChange={setDown} min={0} max={100} suffix="%" /></Field>
          <Field label="Лихва по кредита"><NumInput value={rate} onChange={setRate} step={0.1} suffix="%" /></Field>
          <Field label="Срок на кредита"><NumInput value={term} onChange={setTerm} min={1} max={P.maxTermYears.value} suffix="години" /></Field>
          <Field label="Наем за подобно жилище"><NumInput value={rent} onChange={setRent} step={25} suffix="€/месец" /></Field>
          <Field label="Сравнение след"><NumInput value={years} onChange={setYears} min={1} max={40} suffix="години" /></Field>
          <p className="text-sm font-semibold pt-2">Допускания (на година)</p>
          <Field label="Поскъпване на жилищата"><NumInput value={growth} onChange={setGrowth} step={0.5} suffix="%" /></Field>
          <Field label="Поскъпване на наемите"><NumInput value={rentGrowth} onChange={setRentGrowth} step={0.5} suffix="%" /></Field>
          <Field label="Доходност, ако наемателят инвестира разликата"><NumInput value={ret} onChange={setRet} step={0.5} suffix="%" /></Field>
          <Field label="Поддръжка, ремонти, данък сгради"><NumInput value={upkeep} onChange={setUpkeep} step={0.1} suffix="% от цената" /></Field>
        </>
      }
      result={
        <div aria-live="polite">
          <p className="text-sm text-muted">След {years} години по-изгодно излиза</p>
          <p className="display text-[3rem] mt-1">{better}</p>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div><p className="text-sm text-muted">Купувачът има</p><p className="display num text-[2rem]">{eur(r.buyerWealth, 0)}</p><p className="text-xs text-muted">жилище {eur(r.home, 0)} минус остатък по кредита {eur(r.bal, 0)}</p></div>
            <div><p className="text-sm text-muted">Наемателят има</p><p className="display num text-[2rem]">{eur(r.renterWealth, 0)}</p><p className="text-xs text-muted">инвестираното самоучастие и разликите в разходите</p></div>
          </div>
          <ul className="text-[15px] mt-4 space-y-1.5">
            <li>Месечна вноска по кредита: <b>{eur(r.pay, 0)}</b> (наемът е {eur(rent, 0)})</li>
            <li>Начално нужни пари: самоучастие {eur(r.downAmt, 0)} и около {eur(r.fees, 0)} такси</li>
            <li>За {years} г. купувачът плаща {eur(r.paidInterest, 0)} лихви, наемателят плаща {eur(r.paidRent, 0)} наем</li>
          </ul>
          <Sources items={[{ label: "Средна лихва по жилищни кредити", p: P.mortgageRate }, { label: "Изисквания на БНБ", p: P.maxLtv }]} />
          <Disclaimer>Резултатът зависи най-много от допусканията за поскъпването и доходността, които никой не знае предварително. Пробвайте с по-ниски и по-високи стойности. Наемателят печели само ако наистина инвестира разликата.</Disclaimer>
        </div>
      }
    />
  );
}
