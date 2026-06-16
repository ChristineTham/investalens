/**
 * Monte Carlo simulation for portfolio projections
 */

export interface SimulationParams {
  currentValue: number;
  annualisedReturn: number; // as decimal (e.g. 0.08 for 8%)
  annualisedVolatility: number; // as decimal (e.g. 0.15 for 15%)
  yearsToProject: number;
  numSimulations: number;
  monthlyContribution?: number;
}

export interface SimulationResult {
  percentile5: number[];
  percentile25: number[];
  percentile50: number[];
  percentile75: number[];
  percentile95: number[];
  mean: number[];
  finalValues: number[];
  probabilityOfLoss: number;
  probabilityOfDoubling: number;
  expectedValue: number;
  medianValue: number;
}

/**
 * Generate a normally distributed random number using Box-Muller transform
 */
function normalRandom(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Run Monte Carlo simulation
 */
export function runMonteCarloSimulation(
  params: SimulationParams
): SimulationResult {
  const {
    currentValue,
    annualisedReturn,
    annualisedVolatility,
    yearsToProject,
    numSimulations,
    monthlyContribution = 0,
  } = params;

  const monthlyReturn = annualisedReturn / 12;
  const monthlyVol = annualisedVolatility / Math.sqrt(12);
  const totalMonths = yearsToProject * 12;

  // Run simulations
  const allPaths: number[][] = [];
  const finalValues: number[] = [];

  for (let sim = 0; sim < numSimulations; sim++) {
    const path: number[] = [currentValue];
    let value = currentValue;

    for (let month = 1; month <= totalMonths; month++) {
      const randomReturn = monthlyReturn + monthlyVol * normalRandom();
      value = value * (1 + randomReturn) + monthlyContribution;
      value = Math.max(0, value); // Can't go below zero
      path.push(value);
    }

    allPaths.push(path);
    finalValues.push(value);
  }

  // Calculate percentiles at each time step
  const percentile5: number[] = [];
  const percentile25: number[] = [];
  const percentile50: number[] = [];
  const percentile75: number[] = [];
  const percentile95: number[] = [];
  const mean: number[] = [];

  for (let month = 0; month <= totalMonths; month++) {
    const values = allPaths.map((p) => p[month]).sort((a, b) => a - b);
    percentile5.push(values[Math.floor(numSimulations * 0.05)]);
    percentile25.push(values[Math.floor(numSimulations * 0.25)]);
    percentile50.push(values[Math.floor(numSimulations * 0.5)]);
    percentile75.push(values[Math.floor(numSimulations * 0.75)]);
    percentile95.push(values[Math.floor(numSimulations * 0.95)]);
    mean.push(values.reduce((s, v) => s + v, 0) / numSimulations);
  }

  // Summary stats
  const sortedFinals = [...finalValues].sort((a, b) => a - b);
  const probabilityOfLoss =
    finalValues.filter((v) => v < currentValue).length / numSimulations;
  const probabilityOfDoubling =
    finalValues.filter((v) => v >= currentValue * 2).length / numSimulations;

  return {
    percentile5,
    percentile25,
    percentile50,
    percentile75,
    percentile95,
    mean,
    finalValues: sortedFinals,
    probabilityOfLoss,
    probabilityOfDoubling,
    expectedValue: mean[mean.length - 1],
    medianValue: percentile50[percentile50.length - 1],
  };
}
