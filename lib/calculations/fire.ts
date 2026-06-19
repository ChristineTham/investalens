export interface FIREInput {
  currentAge: number;
  retirementAge: number;
  currentPortfolioValue: number;
  annualContribution: number;
  contributionGrowthRate: number;
  expectedReturnRate: number;
  inflationRate: number;
  annualExpenses: number;
  expenseGrowthRate: number;
  withdrawalRate: number;
  superBalance?: number;
  superAccessAge?: number;
}

export interface YearProjection {
  age: number;
  year: number;
  contributions: number;
  investmentGrowth: number;
  portfolioValue: number;
  expenses: number;
  surplus: number;
}

export interface FIREResult {
  fireNumber: number;
  yearsToFIRE: number;
  fireAge: number;
  projectedPortfolioAtRetirement: number;
  safeWithdrawalAmount: number;
  coastFIRENumber: number;
  yearByYearProjection: YearProjection[];
  scenarios: {
    pessimistic: { fireAge: number; successRate: number };
    baseline: { fireAge: number; successRate: number };
    optimistic: { fireAge: number; successRate: number };
  };
}

export function calculateFIRE(input: FIREInput): FIREResult {
  const {
    currentAge,
    retirementAge,
    currentPortfolioValue,
    annualContribution,
    contributionGrowthRate,
    expectedReturnRate,
    inflationRate,
    annualExpenses,
    expenseGrowthRate,
    withdrawalRate,
    superBalance = 0,
    superAccessAge = 60,
  } = input;

  const realReturn = (1 + expectedReturnRate) / (1 + inflationRate) - 1;
  const fireNumber = annualExpenses / withdrawalRate;
  const maxYears = 80;
  const currentYear = new Date().getFullYear();

  // Find FIRE age (when portfolio >= fireNumber)
  let fireAge = retirementAge;
  let portfolio = currentPortfolioValue;
  let contribution = annualContribution;
  const projection: YearProjection[] = [];

  for (let y = 0; y < maxYears; y++) {
    const age = currentAge + y;
    const year = currentYear + y;
    const isRetired = age >= retirementAge;
    const superAvailable = age >= superAccessAge ? superBalance : 0;
    const totalPortfolio = portfolio + (age === superAccessAge ? superAvailable : 0);

    const expenses = isRetired
      ? annualExpenses * Math.pow(1 + expenseGrowthRate, y)
      : 0;
    const withdrawal = isRetired
      ? Math.min(totalPortfolio * withdrawalRate, expenses)
      : 0;
    const yearContribution = isRetired ? 0 : contribution;
    const growth = totalPortfolio * expectedReturnRate;

    projection.push({
      age,
      year,
      contributions: yearContribution,
      investmentGrowth: growth,
      portfolioValue: totalPortfolio,
      expenses,
      surplus: isRetired ? totalPortfolio * withdrawalRate - expenses : growth + yearContribution,
    });

    if (!isRetired && totalPortfolio >= fireNumber && fireAge === retirementAge) {
      fireAge = age;
    }

    portfolio = totalPortfolio + growth + yearContribution - withdrawal;
    contribution *= 1 + contributionGrowthRate;

    if (portfolio <= 0 && isRetired) break;
  }

  const yearsToFIRE = Math.max(0, fireAge - currentAge);

  // Coast FIRE: value needed today so growth alone reaches fireNumber by retirement
  const yearsToRetirement = retirementAge - currentAge;
  const coastFIRENumber =
    yearsToRetirement > 0
      ? fireNumber / Math.pow(1 + realReturn, yearsToRetirement)
      : fireNumber;

  const retirementIdx = retirementAge - currentAge;
  const projectedAtRetirement =
    retirementIdx < projection.length
      ? projection[retirementIdx].portfolioValue
      : projection[projection.length - 1]?.portfolioValue ?? 0;

  const safeWithdrawalAmount = projectedAtRetirement * withdrawalRate;

  // Scenarios (±2% return adjustment)
  function findFireAge(returnAdj: number): { fireAge: number; successRate: number } {
    let p = currentPortfolioValue;
    let c = annualContribution;
    let fa = retirementAge;
    const adjReturn = expectedReturnRate + returnAdj;
    let survived = true;

    for (let y = 0; y < maxYears; y++) {
      const age = currentAge + y;
      const isRetired = age >= retirementAge;
      const exp = isRetired ? annualExpenses * Math.pow(1 + expenseGrowthRate, y) : 0;
      const w = isRetired ? Math.min(p * withdrawalRate, exp) : 0;
      const cont = isRetired ? 0 : c;

      if (!isRetired && p >= fireNumber && fa === retirementAge) {
        fa = age;
      }

      p = p * (1 + adjReturn) + cont - w;
      c *= 1 + contributionGrowthRate;

      if (p <= 0 && isRetired) {
        survived = false;
        break;
      }
    }

    return { fireAge: fa, successRate: survived ? 100 : 0 };
  }

  return {
    fireNumber,
    yearsToFIRE,
    fireAge,
    projectedPortfolioAtRetirement: projectedAtRetirement,
    safeWithdrawalAmount,
    coastFIRENumber,
    yearByYearProjection: projection,
    scenarios: {
      pessimistic: findFireAge(-0.02),
      baseline: findFireAge(0),
      optimistic: findFireAge(0.02),
    },
  };
}
