"use client";

import {
  TrendingUp,
  TrendingDown,
  Coins,
  Banknote,
  Percent,
  Landmark,
  Receipt,
  Split,
  Gift,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  Merge,
  GitBranch,
  FileText,
  Calendar,
  Settings,
  PiggyBank,
  CreditCard,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { ActivityIconKey } from "@/lib/constants/activity-meta";
import { cn } from "@/lib/utils";

const ICONS: Record<ActivityIconKey, LucideIcon> = {
  buy: TrendingUp,
  sell: TrendingDown,
  dividend: Coins,
  distribution: Banknote,
  interest: Percent,
  coupon: Landmark,
  fee: Receipt,
  split: Split,
  bonus: Gift,
  "return-of-capital": RefreshCw,
  "transfer-in": ArrowDownLeft,
  "transfer-out": ArrowUpRight,
  "merger-in": Merge,
  "merger-out": GitBranch,
  rights: FileText,
  maturity: Calendar,
  adjustment: Settings,
  deposit: ArrowDownLeft,
  withdrawal: ArrowUpRight,
  contribution: PiggyBank,
  income: Coins,
  expense: CreditCard,
  investment: TrendingUp,
  cash: Wallet,
};

/**
 * Renders the lucide icon for an ActivityIconKey. Colour is controlled by the
 * caller (e.g. `style={{ color: meta.colorVar }}` is avoided — use a text class
 * or wrap in a coloured swatch). Defaults to a small icon.
 */
export function ActivityIcon({
  icon,
  className,
}: {
  icon: ActivityIconKey;
  className?: string;
}) {
  const Icon = ICONS[icon] ?? Settings;
  return <Icon className={cn("h-4 w-4", className)} aria-hidden />;
}
