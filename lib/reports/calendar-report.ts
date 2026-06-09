"use server";

import { generateFutureIncomeReport } from "./future-income-report";

export interface CalendarEntry {
  month: number;
  year: number;
  instrumentCode: string;
  estimatedAmount: number;
}

export async function generateCalendarReport(
  portfolioId: string,
  year: number
): Promise<CalendarEntry[]> {
  const items = await generateFutureIncomeReport(portfolioId);
  const entries: CalendarEntry[] = [];

  for (const item of items) {
    if (!item.nextPaymentDate) continue;

    const freqMonths: Record<string, number> = {
      monthly: 1,
      quarterly: 3,
      semi_annual: 6,
      annual: 12,
    };
    const interval = freqMonths[item.frequency] || 12;

    // Project payments for the year
    let payDate = new Date(item.nextPaymentDate);
    // Wind back to start of year if needed
    while (payDate.getFullYear() > year) {
      payDate.setMonth(payDate.getMonth() - interval);
    }
    while (payDate.getFullYear() < year) {
      payDate.setMonth(payDate.getMonth() + interval);
    }

    while (payDate.getFullYear() === year) {
      entries.push({
        month: payDate.getMonth() + 1,
        year,
        instrumentCode: item.instrumentCode,
        estimatedAmount: item.estimatedAmount,
      });
      payDate = new Date(payDate);
      payDate.setMonth(payDate.getMonth() + interval);
    }
  }

  return entries.sort((a, b) => a.month - b.month);
}
