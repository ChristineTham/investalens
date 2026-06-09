import { db } from "@/lib/db";

export interface MaturityAlert {
  instrumentCode: string;
  maturityDate: Date;
  daysRemaining: number;
  portfolioId: string;
}

export async function getMaturityAlerts(
  userId: string,
  windowDays: number = 90
): Promise<MaturityAlert[]> {
  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + windowDays);

  const holdings = await db.holding.findMany({
    where: {
      portfolio: { userId },
      instrument: {
        maturityDate: { gte: today, lte: cutoff },
      },
    },
    include: {
      instrument: { select: { code: true, maturityDate: true } },
      portfolio: { select: { id: true } },
    },
  });

  return holdings
    .filter((h) => h.instrument.maturityDate)
    .map((h) => ({
      instrumentCode: h.instrument.code,
      maturityDate: h.instrument.maturityDate!,
      daysRemaining: Math.floor(
        (h.instrument.maturityDate!.getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24)
      ),
      portfolioId: h.portfolio.id,
    }))
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}
