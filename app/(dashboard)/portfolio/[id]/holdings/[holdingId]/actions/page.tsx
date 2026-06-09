"use client";

import { useState } from "react";
import {
  recordSplit,
  recordBonus,
  recordReturnOfCapital,
  recordRightsIssue,
} from "@/lib/actions/corporate-actions";

export default function CorporateActionsPage({
  params,
}: {
  params: Promise<{ id: string; holdingId: string }>;
}) {
  const [holdingId, setHoldingId] = useState("");
  const [actionType, setActionType] = useState("split");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [value1, setValue1] = useState("");
  const [value2, setValue2] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Resolve params
  useState(() => {
    params.then((p) => setHoldingId(p.holdingId));
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      switch (actionType) {
        case "split":
          await recordSplit(holdingId, Number(value1), new Date(date));
          break;
        case "bonus":
          await recordBonus(holdingId, Number(value1), new Date(date));
          break;
        case "roc":
          await recordReturnOfCapital(holdingId, Number(value1), new Date(date));
          break;
        case "rights":
          await recordRightsIssue(holdingId, Number(value1), Number(value2), new Date(date));
          break;
      }
      setMessage("Corporate action recorded successfully.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  const actionLabels: Record<string, { label1: string; label2?: string }> = {
    split: { label1: "Split Ratio (e.g. 2 for 2:1)" },
    bonus: { label1: "Bonus Shares Quantity" },
    roc: { label1: "Amount Per Share" },
    rights: { label1: "Quantity", label2: "Price Per Share" },
  };

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-bold">Corporate Actions</h1>
      <p className="text-sm text-muted-foreground">
        Record splits, bonus issues, return of capital, and rights issues.
      </p>

      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        {message && (
          <div className="rounded-md border border-border bg-muted p-3 text-sm">
            {message}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="actionType" className="text-sm font-medium">Action Type</label>
          <select
            id="actionType"
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="split">Stock Split</option>
            <option value="bonus">Bonus Issue</option>
            <option value="roc">Return of Capital</option>
            <option value="rights">Rights Issue</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="date" className="text-sm font-medium">Date</label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="value1" className="text-sm font-medium">
            {actionLabels[actionType]?.label1 || "Value"}
          </label>
          <input
            id="value1"
            type="number"
            step="any"
            value={value1}
            onChange={(e) => setValue1(e.target.value)}
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        {actionLabels[actionType]?.label2 && (
          <div className="space-y-2">
            <label htmlFor="value2" className="text-sm font-medium">
              {actionLabels[actionType].label2}
            </label>
            <input
              id="value2"
              type="number"
              step="any"
              value={value2}
              onChange={(e) => setValue2(e.target.value)}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Recording..." : "Record Action"}
        </button>
      </form>
    </div>
  );
}
