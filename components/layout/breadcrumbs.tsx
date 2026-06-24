"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { Fragment } from "react";
import { useBreadcrumbLabels } from "@/components/layout/breadcrumb-context";

const ROUTE_LABELS: Record<string, string> = {
  portfolio: "Portfolios",
  reports: "Reports",
  tax: "Tax",
  tools: "Tools",
  analytics: "Analytics",
  settings: "Settings",
  // Reports sub-pages
  performance: "Performance",
  contribution: "Contribution",
  diversity: "Diversity",
  "future-income": "Future Income",
  "all-trades": "All Trades",
  "sold-securities": "Sold Securities",
  "multi-period": "Multi-Period",
  calendar: "Dividend Calendar",
  drawdown: "Drawdown Risk",
  "historical-cost": "Historical Cost",
  holding: "Holding Detail",
  // Tax sub-pages
  "taxable-income": "Taxable Income",
  cgt: "Capital Gains Tax",
  unrealised: "Unrealised CGT",
  // Portfolio sub-pages
  "add-holding": "Add Holding",
  holdings: "Holdings",
  bonds: "Bonds",
  cash: "Cash Accounts",
  import: "Import",
  consolidated: "Consolidated",
  new: "New Portfolio",
  actions: "Corporate Actions",
  // Settings sub-pages
  groups: "Groups",
  labels: "Labels",
  sharing: "Sharing",
  export: "Export",
  "api-tokens": "API Tokens",
  // Tools sub-pages
  watchlist: "Watchlist",
  // Analytics sub-pages
  risk: "Risk Metrics",
  "monte-carlo": "Monte Carlo",
  "what-if": "What-If Scenarios",
  exposure: "Exposure",
};

function getLabel(segment: string): string {
  return ROUTE_LABELS[segment] || segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function isId(segment: string): boolean {
  // CUID: starts with c followed by 24+ alphanumeric chars
  // UUID: 8-4-4-4-12 hex pattern
  // Generic: 20+ chars that look like an ID
  return (
    /^c[a-z0-9]{24,}$/i.test(segment) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) ||
    (segment.length > 20 && /^[a-z0-9]+$/i.test(segment))
  );
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const dynamicLabels = useBreadcrumbLabels();

  // Don't show breadcrumbs on top-level pages
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) return null;

  const crumbs: Array<{ label: string; href: string; isCurrent: boolean }> = [];

  // Build breadcrumb trail
  let href = "";
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    href += `/${segment}`;

    // Skip rendering IDs as labels but keep them in the path
    if (isId(segment)) {
      // If it's an ID after "portfolio", use a registered name or fall back.
      if (i > 0 && segments[i - 1] === "portfolio") {
        crumbs.push({
          label: dynamicLabels[segment] ?? "Portfolio",
          href,
          isCurrent: i === segments.length - 1,
        });
      }
      // If it's an ID after "holdings", use a registered name or fall back.
      else if (i > 0 && segments[i - 1] === "holdings") {
        crumbs.push({
          label: dynamicLabels[segment] ?? "Holding",
          href,
          isCurrent: i === segments.length - 1,
        });
      }
      // Otherwise skip rendering it but keep the path accumulating
      continue;
    }

    crumbs.push({
      label: getLabel(segment),
      href,
      isCurrent: i === segments.length - 1,
    });
  }

  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1 text-sm">
        <li>
          <Link
            href="/portfolio"
            className="flex items-center text-muted-foreground hover:text-foreground"
          >
            <Home className="h-3.5 w-3.5" />
          </Link>
        </li>
        {crumbs.map((crumb) => (
          <Fragment key={crumb.href}>
            <li className="flex items-center text-muted-foreground">
              <ChevronRight className="h-3.5 w-3.5" />
            </li>
            <li>
              {crumb.isCurrent ? (
                <span className="font-medium text-foreground">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
