/**
 * Shared chart time-range definitions used by the dashboard and portfolio-detail
 * charts. Plain module (no client/server directive) so it can be imported by
 * client components, server components and API routes alike.
 */

export type ChartRange =
  | "1M"
  | "6M"
  | "YTD"
  | "FYTD"
  | "PREVFY"
  | "1Y"
  | "3Y"
  | "5Y"
  | "10Y"
  | "MAX";

export interface RangeOption {
  value: ChartRange;
  label: string;
  /** Longer description for tooltips/aria. */
  title: string;
}

export const CHART_RANGE_OPTIONS: RangeOption[] = [
  { value: "1M", label: "1M", title: "Past month" },
  { value: "6M", label: "6M", title: "Past 6 months" },
  { value: "YTD", label: "YTD", title: "Calendar year to date" },
  { value: "FYTD", label: "FYTD", title: "Current financial year to date" },
  { value: "PREVFY", label: "Prev FY", title: "Previous financial year" },
  { value: "1Y", label: "1Y", title: "Past year" },
  { value: "3Y", label: "3Y", title: "Past 3 years" },
  { value: "5Y", label: "5Y", title: "Past 5 years" },
  { value: "10Y", label: "10Y", title: "Past 10 years" },
  { value: "MAX", label: "All", title: "All time" },
];

const DAY = 86_400_000;

/**
 * Resolve a range to concrete `from`/`to` dates.
 *
 * @param financialYearEnd 1–12, the month the financial year ends (Australian
 *   default 6 = June, so the FY starts 1 July).
 */
export function resolveChartRange(
  range: ChartRange,
  financialYearEnd = 6
): { from: Date; to: Date } {
  const now = new Date();
  const to = now;

  // Financial year starts the first day of the month after it ends.
  const startMonth = financialYearEnd % 12; // 0-based month index of FY start
  const m = now.getMonth();
  const y = now.getFullYear();
  const currentFyStartYear = m >= startMonth ? y : y - 1;
  const currentFyStart = new Date(currentFyStartYear, startMonth, 1);

  switch (range) {
    case "1M":
      return { from: new Date(now.getTime() - 31 * DAY), to };
    case "6M":
      return { from: new Date(now.getTime() - 183 * DAY), to };
    case "YTD":
      return { from: new Date(y, 0, 1), to };
    case "FYTD":
      return { from: currentFyStart, to };
    case "PREVFY": {
      const prevStart = new Date(currentFyStartYear - 1, startMonth, 1);
      const prevEnd = new Date(currentFyStart.getTime() - DAY);
      return { from: prevStart, to: prevEnd };
    }
    case "1Y":
      return { from: new Date(now.getTime() - 365 * DAY), to };
    case "3Y":
      return { from: new Date(now.getTime() - 1095 * DAY), to };
    case "5Y":
      return { from: new Date(now.getTime() - 1825 * DAY), to };
    case "10Y":
      return { from: new Date(now.getTime() - 3650 * DAY), to };
    case "MAX":
    default:
      return { from: new Date(2000, 0, 1), to };
  }
}

/** Short ranges format axis ticks as MM-DD; longer ranges as YYYY-MM. */
export function isShortRange(range: ChartRange): boolean {
  return range === "1M" || range === "6M" || range === "YTD" || range === "FYTD";
}
