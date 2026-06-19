export interface DrawdownEpisode {
  start: string;
  trough: string;
  recovery: string | null;
  depth: number;
  duration: number;
  recoveryDays: number | null;
}

export function drawdownSeries(cumReturns: number[]): number[] {
  const drawdowns: number[] = [];
  let peak = 1 + cumReturns[0];

  for (let i = 0; i < cumReturns.length; i++) {
    const value = 1 + cumReturns[i];
    if (value > peak) peak = value;
    drawdowns.push(peak !== 0 ? (value - peak) / peak : 0);
  }

  return drawdowns;
}

export function detectDrawdowns(
  cumReturns: number[],
  dates: string[],
  threshold = -0.05
): DrawdownEpisode[] {
  const dd = drawdownSeries(cumReturns);
  const episodes: DrawdownEpisode[] = [];

  let inDrawdown = false;
  let start = 0;
  let troughIdx = 0;
  let troughDepth = 0;

  for (let i = 0; i < dd.length; i++) {
    if (!inDrawdown && dd[i] < threshold) {
      // Start of a new drawdown
      inDrawdown = true;
      start = i > 0 ? i - 1 : 0; // peak was the previous point
      troughIdx = i;
      troughDepth = dd[i];
    } else if (inDrawdown) {
      if (dd[i] < troughDepth) {
        troughIdx = i;
        troughDepth = dd[i];
      }
      if (dd[i] >= 0) {
        // Recovered
        episodes.push({
          start: dates[start],
          trough: dates[troughIdx],
          recovery: dates[i],
          depth: troughDepth,
          duration: i - start,
          recoveryDays: i - troughIdx,
        });
        inDrawdown = false;
      }
    }
  }

  // Handle ongoing drawdown (no recovery yet)
  if (inDrawdown) {
    episodes.push({
      start: dates[start],
      trough: dates[troughIdx],
      recovery: null,
      depth: troughDepth,
      duration: dd.length - 1 - start,
      recoveryDays: null,
    });
  }

  return episodes;
}
