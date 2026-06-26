"use client";

import type { SourceValue } from "@/components/analytics/source-picker";

/** Build the matrix-route query string for a portfolio- or model-source. */
export function buildMatrixQuery(value: SourceValue, range: string): string {
  return value.source === "model"
    ? `?source=model&model=${value.id}&range=${range}`
    : `?portfolio=${value.id}&range=${range}`;
}

/**
 * Fetch the shared returns matrix for either a real portfolio or a model. The
 * matrix route returns a byte-compatible shape for both, so callers (optimise,
 * frontier, correlations, factors, stress, black-litterman) are source-agnostic.
 */
export async function fetchAnalyticsMatrix(
  value: SourceValue,
  range: string
): Promise<{
  dates: string[];
  assets: string[];
  returns: number[][];
  weights: number[] | Record<string, number>;
  prices: Record<string, number[]>;
}> {
  const res = await fetch(`/api/v1/analytics/matrix${buildMatrixQuery(value, range)}`);
  if (!res.ok) throw new Error("Failed to load source data");
  return res.json();
}
