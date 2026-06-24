"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

// Searchable content index — each section's key topics
const SEARCH_INDEX: Record<string, string[]> = {
  "getting-started": ["account", "register", "login", "portfolio", "create", "setup", "first", "google", "oauth", "password"],
  "importing": ["csv", "import", "broker", "commsec", "selfwealth", "stake", "template", "upload", "map", "ai importer", "gemini", "pdf"],
  "assets": ["shares", "etf", "bonds", "crypto", "property", "superannuation", "term deposit", "coupon", "yield", "maturity", "duration"],
  "portfolio": ["groups", "labels", "sharing", "consolidated", "transfer", "custom", "organisation", "merge", "broker", "account number", "client number", "charts", "timescale", "allocation", "movement", "detail"],
  "reports": ["performance", "contribution", "diversity", "drawdown", "future income", "sold securities", "multi-period", "calendar", "historical cost", "risk", "exposure"],
  "tax": ["cgt", "capital gains", "taxable income", "ato", "discount", "fifo", "lifo", "minimise", "franking", "amit", "unrealised"],
  "corporate-actions": ["split", "bonus", "return of capital", "rights issue", "merger", "consolidation", "drp"],
  "tools": ["watchlist", "fire", "retirement", "sentiment", "fear greed", "vix", "share checker", "ai assistant", "chat"],
  "analytics": ["backtest", "monte carlo", "optimisation", "optimize", "efficient frontier", "black-litterman", "risk metrics", "sharpe", "sortino", "var", "cvar", "stress test", "factor", "pca", "correlation", "tactical", "momentum", "hrp"],
  "export": ["csv export", "json", "backup", "download", "trades", "holdings", "dividends"],
  "api": ["rest", "token", "bearer", "authentication", "rate limit", "endpoint", "portfolios", "market search"],
};

interface HelpSearchProps {
  sections: { slug: string; title: string; description: string }[];
}

export function HelpSearch({ sections }: HelpSearchProps) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    return sections.filter((section) => {
      const keywords = SEARCH_INDEX[section.slug] || [];
      const titleMatch = section.title.toLowerCase().includes(q);
      const descMatch = section.description.toLowerCase().includes(q);
      const keywordMatch = keywords.some((k) => k.includes(q));
      return titleMatch || descMatch || keywordMatch;
    });
  }, [query, sections]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          type="search"
          placeholder="Search help topics…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-md border border-input bg-background py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Search help topics"
          spellCheck={false}
          autoComplete="off"
        />
      </div>

      {query.length >= 2 && (
        <div className="absolute top-full z-10 mt-2 w-full rounded-md border border-border bg-card shadow-lg">
          {results.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No results for &ldquo;{query}&rdquo;</p>
          ) : (
            <ul className="divide-y divide-border">
              {results.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/help/${r.slug}`}
                    className="block px-4 py-3 text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                    onClick={() => setQuery("")}
                  >
                    <span className="font-medium" dangerouslySetInnerHTML={{ __html: r.title }} />
                    <span className="ml-2 text-muted-foreground" dangerouslySetInnerHTML={{ __html: r.description }} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
