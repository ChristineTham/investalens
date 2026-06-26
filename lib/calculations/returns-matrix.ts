/**
 * Pure helpers over a returns matrix (the shape returned by
 * /api/v1/analytics/matrix). Kept framework- and DB-free so client components
 * can import them directly.
 */

export interface ReturnsMatrixLike {
  dates: string[];
  assets: string[];
  returns: number[][];
  /** Either an ordered array (real portfolios) or a code→weight map (models). */
  weights: number[] | Record<string, number>;
}

/** Resolve matrix weights into an ordered array aligned to `assets`. */
export function resolveWeights(matrix: ReturnsMatrixLike): number[] {
  const n = matrix.assets.length;
  let weights: number[];

  if (Array.isArray(matrix.weights)) {
    weights = matrix.assets.map((_, i) => Number(matrix.weights[i] ?? 0));
  } else {
    const map = matrix.weights as Record<string, number>;
    weights = matrix.assets.map((code) => Number(map[code] ?? 0));
  }

  const total = weights.reduce((a, w) => a + w, 0);
  // Fall back to equal weights when nothing usable was supplied.
  if (!(total > 0)) return new Array(n).fill(n > 0 ? 1 / n : 0);
  return weights.map((w) => w / total);
}

/**
 * Collapse a per-asset returns matrix into a single weighted daily return
 * series: r_t = Σ_i w_i · returns[t][i]. Shared by real and model selections
 * when comparing whole portfolios.
 */
export function collapseToReturnSeries(matrix: ReturnsMatrixLike): {
  dates: string[];
  returns: number[];
} {
  const weights = resolveWeights(matrix);
  const returns = matrix.returns.map((row) => {
    let sum = 0;
    for (let i = 0; i < weights.length; i++) sum += weights[i] * (row[i] ?? 0);
    return sum;
  });
  return { dates: matrix.dates, returns };
}
