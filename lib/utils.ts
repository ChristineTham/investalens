import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(
  amount: number,
  currency: string = "AUD",
  locale: string = "en-AU"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(value: number, decimals: number = 2): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

export function formatDate(date: Date | string, format: string = "short"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (format === "iso") return d.toISOString().split("T")[0];
  return d.toLocaleDateString("en-AU", {
    year: "numeric",
    month: format === "long" ? "long" : "short",
    day: "numeric",
  });
}
