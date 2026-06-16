"use client";

import { useState, useEffect } from "react";
import { Download } from "lucide-react";
import {
  exportTrades,
  exportHoldings,
  exportDividends,
  exportFullBackup,
} from "@/lib/export/csv-export";

export default function ExportPage() {
  const [portfolios, setPortfolios] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState("");
  const [exporting, setExporting] = useState("");

  useEffect(() => {
    fetch("/api/v1/portfolios", {
      headers: { Authorization: "Bearer internal" },
    }).catch(() => {});
    // Load portfolios via server action alternative
    import("@/lib/actions/portfolio").then((mod) => {
      mod.getPortfolios().then((p) => {
        setPortfolios(p);
        if (p.length > 0) setSelectedPortfolioId(p[0].id);
      });
    });
  }, []);

  async function handleExport(type: string) {
    if (!selectedPortfolioId) return;
    setExporting(type);

    try {
      let content: string;
      let filename: string;

      switch (type) {
        case "trades":
          content = await exportTrades(selectedPortfolioId);
          filename = "investalens-trades.csv";
          break;
        case "holdings":
          content = await exportHoldings(selectedPortfolioId);
          filename = "investalens-holdings.csv";
          break;
        case "dividends":
          content = await exportDividends(selectedPortfolioId);
          filename = "investalens-dividends.csv";
          break;
        case "backup":
          content = await exportFullBackup(selectedPortfolioId);
          filename = "investalens-backup.json";
          break;
        default:
          return;
      }

      // Trigger download
      const blob = new Blob([content], {
        type: type === "backup" ? "application/json" : "text/csv",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting("");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-bold">Export Data</h1>
      <p className="text-sm text-muted-foreground">
        Export your portfolio data as CSV or JSON backup.
      </p>

      {/* Portfolio selector */}
      <div className="flex items-center gap-2">
        <label
          htmlFor="export-portfolio"
          className="text-sm font-medium text-muted-foreground"
        >
          Portfolio:
        </label>
        <select
          id="export-portfolio"
          value={selectedPortfolioId}
          onChange={(e) => setSelectedPortfolioId(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          {portfolios.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <button
          onClick={() => handleExport("trades")}
          disabled={!!exporting || !selectedPortfolioId}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-accent disabled:opacity-50"
        >
          <Download className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-medium">
              {exporting === "trades" ? "Exporting..." : "Export Trades (CSV)"}
            </h3>
            <p className="text-sm text-muted-foreground">
              All transactions with dates, prices, and brokerage
            </p>
          </div>
        </button>
        <button
          onClick={() => handleExport("holdings")}
          disabled={!!exporting || !selectedPortfolioId}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-accent disabled:opacity-50"
        >
          <Download className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-medium">
              {exporting === "holdings"
                ? "Exporting..."
                : "Export Holdings (CSV)"}
            </h3>
            <p className="text-sm text-muted-foreground">
              Current positions with instrument details
            </p>
          </div>
        </button>
        <button
          onClick={() => handleExport("dividends")}
          disabled={!!exporting || !selectedPortfolioId}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-accent disabled:opacity-50"
        >
          <Download className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-medium">
              {exporting === "dividends"
                ? "Exporting..."
                : "Export Dividends (CSV)"}
            </h3>
            <p className="text-sm text-muted-foreground">
              Dividend and distribution records with franking
            </p>
          </div>
        </button>
        <button
          onClick={() => handleExport("backup")}
          disabled={!!exporting || !selectedPortfolioId}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-accent disabled:opacity-50"
        >
          <Download className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-medium">
              {exporting === "backup"
                ? "Exporting..."
                : "Full Backup (JSON)"}
            </h3>
            <p className="text-sm text-muted-foreground">
              Complete portfolio data including settings and transactions
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
