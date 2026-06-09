"use client";

import { Download } from "lucide-react";

export default function ExportPage() {
  async function handleExport(type: string) {
    alert(
      `Export ${type} — requires a portfolio ID. Use the API endpoint or implement portfolio selector.`
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-bold">Export Data</h1>
      <p className="text-sm text-muted-foreground">
        Export your portfolio data as CSV or JSON backup.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <button
          onClick={() => handleExport("trades")}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
        >
          <Download className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-medium">Export Trades (CSV)</h3>
            <p className="text-sm text-muted-foreground">
              All transactions with dates, prices, and brokerage
            </p>
          </div>
        </button>
        <button
          onClick={() => handleExport("holdings")}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
        >
          <Download className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-medium">Export Holdings (CSV)</h3>
            <p className="text-sm text-muted-foreground">
              Current positions with cost base
            </p>
          </div>
        </button>
        <button
          onClick={() => handleExport("dividends")}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
        >
          <Download className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-medium">Export Dividends (CSV)</h3>
            <p className="text-sm text-muted-foreground">
              Dividend and distribution records
            </p>
          </div>
        </button>
        <button
          onClick={() => handleExport("backup")}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
        >
          <Download className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-medium">Full Backup (JSON)</h3>
            <p className="text-sm text-muted-foreground">
              Complete portfolio data including all settings
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
