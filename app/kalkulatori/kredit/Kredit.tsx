"use client";

import { useMemo, useState } from "react";
import { CalcLayout, NumInput, Segmented, Verdict } from "@/components/CalcLayout";
import { Disclaimer, Field, Row, Sources, eur, pct } from "@/components/ui";
import { loanSummary } from "@/lib/calc";
import { BNB_PERIOD, P, monthLabel } from "@/lib/params";

type Kind = "home" | "car" | "consumer";

export function Kredit() {
  const [kind, setKind] = useState<Kind>("home");
  const [price, setPrice] = useState(180000);
  const [amount, setAmount] = useState(150000);
  const [rate, setRate] = useState(P.mortgageRate.value * 100);
  const [years, setYears] = useState(30);
  const [type, setType] = useState<"annuity" | "declining">("annuity");
  const [income, setIncome] = useState(2000);
  const [other, setOther] = useState(0);
  const [fees, setFees] = useState(0);
  const [showPlan, setShowPlan] = useState(false);

  function switchKind(k: Kind) {
    setKind(k);
    if (k === "home") { setRate(P.mortgageRate.value * 100); setYears(30); setAmount(150000); setPrice(180000); }
    else { setRate(P.consumerRate.value * 100); setYears(5); setAmount(20000); setPrice(25000); }
  }

  const s = useMemo(
    () => loanSummary({
      principal: amount, annualRate: rate / 100, years, type, fees, netIncome: income, otherPayments: other,
      propertyPrice: kind === "home" ? price : undefined, maxDsti: P.maxDsti.value, maxLtv: P.maxLtv.value,
    }),
    [amount, rate, years, type, fees, income, other, price, kind],
  );

  const dstiOk = s.dsti !== null && s.dsti <= P.maxDsti.value;
  const ltvOk = kind !== "home" || (s.ltv !== null && s.ltv <= P.maxLtv.value);
  const termOk = kind !== "home" || years <= P.maxTermYears.value;
  const minOwn = kind === "home" ? Math.max(0, price - price * P.maxLtv.value) : 0;
  const yearly = s.rows.filter((r) => r.month % 12 === 0 || r.month === s.rows.length);

  return (
    <CalcLayout
      form={
        <>
          <Segmented value={kind} onChange={switchKind} options={[
            { value: "home", label: "Жилище" }, { value: "car", label: "Кола" }, { value: "consumer", label: "Потребителски" },
          ]} />
          {kind === "home" && (
            <Field label="Цена на имота"><NumInput value={price} onChange={setPrice} step={1000} suffix="€" /></Field>
          )}
          <Field label="Сума на кредита"><NumInput value={amount} onChange={setAmount} step={1000} suffix="€" /></Field>
          <Field label="Годишна лихва" hint={`Средно за България през ${monthLabel(BNB_PERIOD)}: ${pct(kind === "home" ? P.mortgageRate.value : P.consumerRate.value, 2)} (БНБ). Вашата оферта може да е различна.`}>
            <NumInput value={rate} onChange={setRate} step={0.05} suffix="%" />
          </Field>
          <Field label="Срок"><NumInput value={years} onChange={setYears} step={1} min={1} max={40} suffix="години" /></Field>
          <Field label="Вид на вноските">
            <Segmented value={type} onChange={setType} options={[
              { value: "annuity", label: "Равни (анюитетни)" }, { value: "declining", label: "Намаляващи" },
            ]} />
          </Field>
          <Field label="Такси (еднократно, общо)"><NumInput value={fees} onChange={setFees} step={50} suffix="€" /></Field>
          <Field label="Нетен месечен доход на домакинството" hint="Това, което реално получавате по сметка.">
            <NumInput value={income} onChange={setIncome} step={50} suffix="€" />
          </Field>
          <Field label="Други месечни вноски по кредити и лизинги"><NumInput value={other} onChange={setOther} step={10} suffix="€" /></Field>
        </>
      }
      result={
        <div aria-live="polite">
          <p className="text-sm text-muted">{type === "annuity" ? "Месечна вноска" : "Първа месечна вноска"}</p>
          <p className="display num text-[4.2rem] mt-1">{eur(s.firstPayment)}</p>

          <div className="mt-6">
            <Row label="Общо ще върнете" value={eur(s.totalPaid)} />
            <Row label="От тях лихви и такси" value={eur(s.totalInterest + fees)} />
            <Row label="Надплащане спрямо взетото" value={pct((s.totalPaid - amount) / Math.max(amount, 1))} />
          </div>

          <h2 className="display text-[1.8rem] mt-8">Ще ви го отпуснат ли?</h2>
          <Verdict ok={dstiOk && ltvOk && termOk}>
            {dstiOk && ltvOk && termOk ? (
              <p>Параметрите са в рамките на изискванията на БНБ. Банката пак ще прегледа целия ви кредитен профил.</p>
            ) : (
              <p>Поне едно изискване на БНБ не е изпълнено. Вижте кое по-долу.</p>
            )}
          </Verdict>
          <Row label="Вноски към дохода (макс. 50%)" value={s.dsti === null ? "—" : pct(s.dsti)} />
          {s.maxPaymentAllowed !== null && <Row label="Най-голямата вноска, която позволява доходът ви" value={eur(s.maxPaymentAllowed)} />}
          <Row label="Нужен нетен доход за тази вноска" value={eur(s.minIncomeNeeded)} />
          {kind === "home" && (
            <>
              <Row label="Кредит към цената на имота (макс. 85%)" value={s.ltv === null ? "—" : pct(s.ltv)} />
              <Row label="Нужни собствени средства (поне)" value={eur(minOwn, 0)} />
              {!termOk && <p className="text-sm text-red mt-2">Срокът на жилищен кредит е до 30 години.</p>}
            </>
          )}

          <h2 className="display text-[1.8rem] mt-8">Ако лихвата се вдигне</h2>
          <p className="text-sm text-muted mb-2">Повечето кредити у нас са с плаваща лихва.</p>
          {s.stress.map((x) => (
            <Row key={x.delta} label={`+${x.delta * 100} пр.п. (лихва ${pct(rate / 100 + x.delta, 2)})`} value={`${eur(x.payment)} (${x.payment >= s.firstPayment ? "+" : ""}${eur(x.payment - s.firstPayment)})`} />
          ))}

          <button type="button" onClick={() => setShowPlan(!showPlan)} className="mt-6 text-green underline underline-offset-4">
            {showPlan ? "Скрий" : "Покажи"} погасителния план по години
          </button>
          {showPlan && (
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-sm num">
                <thead>
                  <tr className="text-left border-b border-ink"><th className="py-1">Година</th><th>Вноска</th><th>Лихва за годината</th><th>Остатък</th></tr>
                </thead>
                <tbody>
                  {yearly.map((r) => {
                    const yr = Math.ceil(r.month / 12);
                    const interestYear = s.rows.slice((yr - 1) * 12, yr * 12).reduce((a, b) => a + b.interest, 0);
                    return (
                      <tr key={r.month} className="border-b border-rule">
                        <td className="py-1">{yr}</td><td>{eur(r.payment)}</td><td>{eur(interestYear)}</td><td>{eur(r.balance, 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Sources items={[
            { label: "Средна лихва, жилищни кредити", p: P.mortgageRate },
            { label: "Средна лихва, потребителски кредити", p: P.consumerRate },
            { label: "Макс. вноски към дохода (DSTI)", p: P.maxDsti },
            { label: "Макс. кредит към стойност на имота (LTV)", p: P.maxLtv },
            { label: "Макс. срок", p: P.maxTermYears },
          ]} />
          <Disclaimer />
        </div>
      }
    />
  );
}
