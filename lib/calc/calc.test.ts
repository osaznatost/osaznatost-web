import { describe, expect, it } from "vitest";
import { annuityPayment, futureValue, grossFromNet, loanSummary, personalInflation, realValue, salary, vatIncluded } from "./index";
import { P } from "../params";

const sp = {
  employeeRate: P.employeeRate.value,
  employerRate: P.employerRate.value,
  incomeTax: P.incomeTax.value,
  maxInsurable: P.maxInsurable.value,
};

describe("кредит", () => {
  it("ипотека 150 000 € при 2,41% за 30 г.", () => {
    expect(annuityPayment(150000, 0.0241, 360)).toBeCloseTo(585.69, 2);
    const s = loanSummary({ principal: 150000, annualRate: 0.0241, years: 30 });
    expect(s.totalInterest).toBeCloseTo(60847.08, 0);
    expect(s.minIncomeNeeded).toBeCloseTo(1171.37, 1);
  });
  it("потребителски 20 000 € при 8,76% за 5 г.", () => {
    expect(annuityPayment(20000, 0.0876, 60)).toBeCloseTo(412.84, 2);
  });
  it("намаляващи вноски изплащат главницата", () => {
    const s = loanSummary({ principal: 12000, annualRate: 0.05, years: 1, type: "declining" });
    expect(s.rows.at(-1)!.balance).toBeCloseTo(0, 6);
    expect(s.firstPayment).toBeCloseTo(1050, 2);
  });
  it("DSTI и LTV", () => {
    const s = loanSummary({ principal: 150000, annualRate: 0.0241, years: 30, netIncome: 1000, propertyPrice: 170000 });
    expect(s.dsti).toBeGreaterThan(0.5);
    expect(s.ltv).toBeCloseTo(0.882, 3);
  });
});

describe("лична инфлация", () => {
  it("пример от документацията дава 6,25%", () => {
    const r = personalInflation(
      { food: 400, housing: 200, transport: 250, restaurants: 150, communication: 50, personal: 50 },
      { food: 1.2, housing: 5.1, transport: 14.5, restaurants: 9.3, communication: 1.8, personal: 5.3 },
    );
    expect(r.rate).toBeCloseTo(6.25, 2);
    expect(r.contributions[0].id).toBe("transport");
  });
});

describe("сложна лихва", () => {
  it("200 €/мес за 20 г.", () => {
    expect(futureValue({ start: 0, monthly: 200, annualRate: 0, years: 20 }).value).toBeCloseTo(48000, 2);
    expect(futureValue({ start: 0, monthly: 200, annualRate: 0.0157, years: 20 }).value).toBeCloseTo(56347.85, 1);
    expect(futureValue({ start: 0, monthly: 200, annualRate: 0.07, years: 20 }).value).toBeCloseTo(104185.33, 1);
    expect(realValue(48000, 0.045, 20)).toBeCloseTo(19902.86, 1);
  });
});

describe("заплата и данъци", () => {
  it("бруто 1500 €", () => {
    const s = salary(1500, sp);
    expect(s.employeeContrib).toBeCloseTo(206.7, 2);
    expect(s.tax).toBeCloseTo(129.33, 2);
    expect(s.net).toBeCloseTo(1163.97, 2);
    expect(s.employerContrib).toBeCloseTo(283.8, 2);
  });
  it("таван на осигурителния доход", () => {
    const s = salary(5000, sp);
    expect(s.employeeContrib).toBeCloseTo(2300 * 0.1378, 2);
  });
  it("нето → бруто е обратна функция", () => {
    expect(grossFromNet(1163.97, sp)).toBeCloseTo(1500, 1);
    expect(salary(grossFromNet(4000, sp), sp).net).toBeCloseTo(4000, 1);
  });
  it("ДДС в цена", () => {
    expect(vatIncluded(120, 0.2)).toBeCloseTo(20, 6);
  });
});
