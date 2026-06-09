export function calculateYTM(
  faceValue: number,
  couponRate: number,
  price: number,
  yearsToMaturity: number,
  frequency: number = 2
): number {
  if (yearsToMaturity <= 0 || price <= 0) return 0;

  const coupon = (faceValue * couponRate) / frequency;
  const periods = yearsToMaturity * frequency;

  // Newton-Raphson approximation
  let ytm = couponRate; // initial guess
  for (let i = 0; i < 100; i++) {
    const r = ytm / frequency;
    let pv = 0;
    let dpv = 0;

    for (let t = 1; t <= periods; t++) {
      const df = Math.pow(1 + r, -t);
      pv += coupon * df;
      dpv -= t * coupon * df / (1 + r);
    }
    pv += faceValue * Math.pow(1 + r, -periods);
    dpv -= periods * faceValue * Math.pow(1 + r, -(periods + 1));

    pv /= frequency;
    dpv /= frequency;

    const diff = pv - price;
    if (Math.abs(diff) < 0.0001) break;

    ytm -= diff / dpv * frequency;
  }

  return ytm;
}

export function calculateModifiedDuration(
  ytm: number,
  couponRate: number,
  yearsToMaturity: number,
  frequency: number = 2
): number {
  if (yearsToMaturity <= 0) return 0;

  const r = ytm / frequency;
  const periods = yearsToMaturity * frequency;
  const coupon = couponRate / frequency;

  let numerator = 0;
  let denominator = 0;

  for (let t = 1; t <= periods; t++) {
    const df = Math.pow(1 + r, -t);
    numerator += (t / frequency) * coupon * df;
    denominator += coupon * df;
  }

  const df = Math.pow(1 + r, -periods);
  numerator += yearsToMaturity * df;
  denominator += df;

  const macDuration = numerator / denominator;
  return macDuration / (1 + r);
}

export function calculateAccruedInterest(
  faceValue: number,
  couponRate: number,
  lastCouponDate: Date,
  settlementDate: Date,
  frequency: number = 2
): number {
  const daysSinceLastCoupon = Math.floor(
    (settlementDate.getTime() - lastCouponDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysInPeriod = 365 / frequency;
  const couponPerPeriod = (faceValue * couponRate) / frequency;

  return couponPerPeriod * (daysSinceLastCoupon / daysInPeriod);
}

export interface CouponPayment {
  date: Date;
  amount: number;
}

export function generateCouponSchedule(
  faceValue: number,
  couponRate: number,
  maturityDate: Date,
  frequency: number = 2,
  startDate: Date = new Date()
): CouponPayment[] {
  const schedule: CouponPayment[] = [];
  const couponAmount = (faceValue * couponRate) / frequency;
  const monthsPerPeriod = 12 / frequency;

  let nextDate = new Date(startDate);
  // Find next coupon date
  while (nextDate <= startDate) {
    nextDate.setMonth(nextDate.getMonth() + monthsPerPeriod);
  }

  while (nextDate <= maturityDate) {
    schedule.push({ date: new Date(nextDate), amount: couponAmount });
    nextDate = new Date(nextDate);
    nextDate.setMonth(nextDate.getMonth() + monthsPerPeriod);
  }

  return schedule;
}

export interface MaturityItem {
  instrumentCode: string;
  maturityDate: Date;
  faceValue: number;
  daysToMaturity: number;
}

export function getMaturityLadder(
  holdings: Array<{
    instrument: { code: string; maturityDate: Date | null; faceValue: number | null };
  }>
): MaturityItem[] {
  const today = new Date();

  return holdings
    .filter((h) => h.instrument.maturityDate)
    .map((h) => ({
      instrumentCode: h.instrument.code,
      maturityDate: h.instrument.maturityDate!,
      faceValue: Number(h.instrument.faceValue || 0),
      daysToMaturity: Math.floor(
        (h.instrument.maturityDate!.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      ),
    }))
    .sort((a, b) => a.daysToMaturity - b.daysToMaturity);
}
