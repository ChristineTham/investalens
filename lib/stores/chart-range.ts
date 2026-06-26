"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChartRange } from "@/lib/constants/chart-ranges";

interface ChartRangeState {
  range: ChartRange;
  /** True once the user has explicitly picked a range anywhere. Lets pages keep
   *  their own default until the shared range is deliberately set. */
  touched: boolean;
  setRange: (range: ChartRange) => void;
}

/**
 * Global, persisted timescale. Selecting a range on any page (dashboard,
 * portfolio, reports, analytics, …) applies to every page and survives reloads.
 * `skipHydration` keeps SSR deterministic; {@link useChartRange} rehydrates from
 * localStorage after mount to avoid hydration mismatches.
 */
export const useChartRangeStore = create<ChartRangeState>()(
  persist(
    (set) => ({
      range: "1Y",
      touched: false,
      setRange: (range) => set({ range, touched: true }),
    }),
    { name: "il-chart-range", skipHydration: true }
  )
);

/**
 * Bind a component to the shared timescale. Returns `[range, setRange]` like
 * `useState`, so existing `<RangeSelector value onChange>` call sites can switch
 * over with a one-line change.
 */
export function useChartRange(): [ChartRange, (range: ChartRange) => void] {
  const range = useChartRangeStore((s) => s.range);
  const setRange = useChartRangeStore((s) => s.setRange);

  useEffect(() => {
    // Idempotent — pulls the persisted value in after first client render.
    void useChartRangeStore.persist.rehydrate();
  }, []);

  return [range, setRange];
}
