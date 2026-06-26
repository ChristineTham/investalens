"use client";

import {
  Briefcase,
  Wallet,
  PiggyBank,
  TrendingUp,
  Target,
  Landmark,
  Building2,
  Coins,
  Gem,
  LineChart,
  BarChart3,
  Rocket,
  ShieldCheck,
  Leaf,
  Globe,
  Home,
  type LucideIcon,
} from "lucide-react";
import type { PortfolioIconKey } from "@/lib/constants/portfolio-identity";
import { cn } from "@/lib/utils";

const ICONS: Record<PortfolioIconKey, LucideIcon> = {
  Briefcase,
  Wallet,
  PiggyBank,
  TrendingUp,
  Target,
  Landmark,
  Building2,
  Coins,
  Gem,
  LineChart,
  BarChart3,
  Rocket,
  ShieldCheck,
  Leaf,
  Globe,
  Home,
};

/** Renders the lucide icon for a portfolio identity key. */
export function PortfolioIcon({
  icon,
  className,
}: {
  icon: PortfolioIconKey;
  className?: string;
}) {
  const Icon = ICONS[icon] ?? Briefcase;
  return <Icon className={cn("h-4 w-4", className)} aria-hidden />;
}
