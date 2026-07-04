"use client";

import { useState, useEffect } from "react";
import { addHoldingWithTransaction } from "@/lib/actions/holding";
import { InstrumentSearch } from "@/components/forms/instrument-search";
import type { InstrumentSearchResult } from "@/lib/providers/market-data";
import { TRANSACTION_TYPE_META } from "@/lib/constants/activity-meta";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const fieldClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

export default function AddHoldingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [portfolioId, setPortfolioId] = useState<string>("");
  const [selected, setSelected] = useState<InstrumentSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Initial transaction details.
  const [transactionType, setTransactionType] = useState("BUY");
  const [tradeDate, setTradeDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [brokerage, setBrokerage] = useState("0");

  useEffect(() => {
    params.then((p) => setPortfolioId(p.id));
  }, [params]);

  async function handleAdd() {
    if (!selected || !portfolioId) return;
    setLoading(true);
    setError("");

    try {
      await addHoldingWithTransaction({
        portfolioId,
        instrumentCode: selected.code,
        marketCode: selected.exchange || "ASX",
        instrumentName: selected.name,
        instrumentType: selected.type,
        transaction: {
          transactionType,
          tradeDate,
          quantity: Number(quantity),
          price: Number(price),
          brokerage: Number(brokerage || 0),
        },
      });
      window.location.href = `/portfolio/${portfolioId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add holding");
      setLoading(false);
    }
  }

  const canSubmit =
    !!selected && !!portfolioId && quantity !== "" && price !== "" && !loading;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/portfolio/${portfolioId}`}
          className="rounded-md p-2 hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-serif text-2xl font-bold">Add Holding</h1>
      </div>

      <div className="max-w-md space-y-4">
        {error && (
          <div
            role="alert"
            className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Search Instrument</label>
          <InstrumentSearch
            market="ASX"
            onSelect={setSelected}
            placeholder="Search ASX instruments..."
          />
        </div>

        {selected && (
          <>
            <div className="rounded-md border border-border bg-muted/50 p-4">
              <p className="font-medium">{selected.code}</p>
              <p className="text-sm text-muted-foreground">{selected.name}</p>
              <p className="text-xs text-muted-foreground">
                {selected.exchange} · {selected.type}
              </p>
            </div>

            <div className="rounded-md border border-border p-4">
              <h2 className="mb-3 text-sm font-medium">Opening transaction</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="type" className="text-xs font-medium">
                    Type
                  </label>
                  <select
                    id="type"
                    value={transactionType}
                    onChange={(e) => setTransactionType(e.target.value)}
                    className={fieldClass}
                  >
                    {Object.entries(TRANSACTION_TYPE_META).map(([v, m]) => (
                      <option key={v} value={v}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="date" className="text-xs font-medium">
                    Date
                  </label>
                  <input
                    id="date"
                    type="date"
                    value={tradeDate}
                    onChange={(e) => setTradeDate(e.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="qty" className="text-xs font-medium">
                    Quantity
                  </label>
                  <input
                    id="qty"
                    type="number"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="price" className="text-xs font-medium">
                    Price
                  </label>
                  <input
                    id="price"
                    type="number"
                    step="any"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="brokerage" className="text-xs font-medium">
                    Brokerage
                  </label>
                  <input
                    id="brokerage"
                    type="number"
                    step="any"
                    value={brokerage}
                    onChange={(e) => setBrokerage(e.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        <button
          onClick={handleAdd}
          disabled={!canSubmit}
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add to Portfolio"}
        </button>
      </div>
    </div>
  );
}
