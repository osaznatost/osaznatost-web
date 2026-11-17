// Чисти функции за калкулаторите. Без UI, лесни за тестване.

export function annuityPayment(principal: number, annualRate: number, months: number): number {
  if (months <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

export type ScheduleRow = { month: number; payment: number; interest: number; principal: number; balance: number };

export function loanSchedule(
  principal: number,
  annualRate: number,
  months: number,
  type: "annuity" | "declining" = "annuity",
): ScheduleRow[] {
  const r = annualRate / 12;
  const rows: ScheduleRow[] = [];
  let balance = principal;
  const fixed = annuityPayment(principal, annualRate, months);
  const principalPart = principal / months;
  for (let m = 1; m <= months; m++) {
    const interest = balance * r;
    const princ = type === "annuity" ? fixed - interest : principalPart;
    const payment = princ + interest;
    balance = Math.max(0, balance - princ);
    rows.push({ month: m, payment, interest, principal: princ, balance });
  }
  return rows;
}

export function loanSummary(input: {
  principal: number;
  annualRate: number;
  years: number;
  type?: "annuity" | "declining";
  fees?: number;
  netIncome?: number;
  otherPayments?: number;
  propertyPrice?: number;
  maxDsti?: number;
  maxLtv?: number;
}) {
  const months = Math.round(input.years * 12);
  const rows = loanSchedule(input.principal, input.annualRate, months, input.type ?? "annuity");
  const firstPayment = rows[0]?.payment ?? 0;
  const totalPaid = rows.reduce((s, r) => s + r.payment, 0) + (input.fees ?? 0);
  const totalInterest = totalPaid - input.principal - (input.fees ?? 0);
  const dsti =
    input.netIncome && input.netIncome > 0 ? (firstPayment + (input.otherPayments ?? 0)) / input.netIncome : null;
  const ltv = input.propertyPrice && input.propertyPrice > 0 ? input.principal / input.propertyPrice : null;
  const maxDsti = input.maxDsti ?? 0.5;
  const maxPaymentAllowed =
    input.netIncome && input.netIncome > 0 ? Math.max(0, input.netIncome * maxDsti - (input.otherPayments ?? 0)) : null;
  const minIncomeNeeded = (firstPayment + (input.otherPayments ?? 0)) / maxDsti;
  const stress = [0.01, 0.02].map((d) => ({
    delta: d,
    payment: input.type === "declining"
      ? loanSchedule(input.principal, input.annualRate + d, months, "declining")[0].payment
      : annuityPayment(input.principal, input.annualRate + d, months),
  }));
  return { months, firstPayment, totalPaid, totalInterest, dsti, ltv, maxPaymentAllowed, minIncomeNeeded, stress, rows };
}

/** Лична инфлация: претеглена средна от инфлацията по групи. rates в %. */
export function personalInflation(spending: Record<string, number>, rates: Record<string, number>) {
  const total = Object.values(spending).reduce((s, v) => s + (v > 0 ? v : 0), 0);
  if (total === 0) return { rate: 0, total: 0, contributions: [] as { id: string; share: number; contribution: number }[] };
  const contributions = Object.entries(spending)
    .filter(([, v]) => v > 0)
    .map(([id, v]) => {
      const share = v / total;
      return { id, share, contribution: share * (rates[id] ?? 0) };
    })
    .sort((a, b) => b.contribution - a.contribution);
  const rate = contributions.reduce((s, c) => s + c.contribution, 0);
  return { rate, total, contributions };
}

/** Бъдеща стойност с месечна капитализация и вноска в края на месеца. */
export function futureValue(opts: { start: number; monthly: number; annualRate: number; years: number; annualFee?: number }) {
  const net = opts.annualRate - (opts.annualFee ?? 0);
  const months = Math.round(opts.years * 12);
  let v = opts.start;
  const yearly: { year: number; value: number; contributed: number }[] = [{ year: 0, value: v, contributed: opts.start }];
  for (let m = 1; m <= months; m++) {
    v = v * (1 + net / 12) + opts.monthly;
    if (m % 12 === 0) yearly.push({ year: m / 12, value: v, contributed: opts.start + opts.monthly * m });
  }
  return { value: v, contributed: opts.start + opts.monthly * months, yearly };
}

export function realValue(nominal: number, inflation: number, years: number) {
  return nominal / Math.pow(1 + inflation, years);
}

/** Заплата по трудов договор: бруто → нето и цена на труда. */
export function salary(gross: number, p: { employeeRate: number; employerRate: number; incomeTax: number; maxInsurable: number }) {
  const base = Math.min(gross, p.maxInsurable);
  const employeeContrib = base * p.employeeRate;
  const tax = Math.max(0, (gross - employeeContrib) * p.incomeTax);
  const net = gross - employeeContrib - tax;
  const employerContrib = base * p.employerRate;
  const laborCost = gross + employerContrib;
  return { gross, base, employeeContrib, tax, net, employerContrib, laborCost };
}

/** Обратно: нето → бруто (двоично търсене, защото таванът прави функцията нелинейна). */
export function grossFromNet(net: number, p: Parameters<typeof salary>[1]) {
  let lo = net, hi = net * 3 + 10000;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (salary(mid, p).net < net) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** ДДС, съдържащ се в крайна цена. */
export function vatIncluded(priceWithVat: number, rate: number) {
  return priceWithVat - priceWithVat / (1 + rate);
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}
