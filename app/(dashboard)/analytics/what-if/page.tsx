"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatPercent } from "@/lib/utils";
import {
  listModelsForPicker,
  getModelWhatIfHoldings,
} from "@/lib/actions/model";

interface Scenario {
  name: string;
  marketMove: number; // percentage (e.g. -20 for 20% crash)
}

interface Holding {
  code: string;
  value: number;
  beta: number;
}

const PRESET_SCENARIOS: Scenario[] = [
  { name: "Market Crash (-30%)", marketMove: -30 },
  { name: "Correction (-10%)", marketMove: -10 },
  { name: "Flat (0%)", marketMove: 0 },
  { name: "Rally (+15%)", marketMove: 15 },
  { name: "Bull Market (+30%)", marketMove: 30 },
  { name: "GFC-style (-50%)", marketMove: -50 },
];

export default function WhatIfPage() {
  const [holdings, setHoldings] = useState<Holding[]>([
    { code: "CBA", value: 20000, beta: 0.9 },
    { code: "BHP", value: 15000, beta: 1.3 },
    { code: "CSL", value: 25000, beta: 0.7 },
    { code: "FMG", value: 10000, beta: 1.8 },
    { code: "TLS", value: 8000, beta: 0.5 },
  ]);
  const [customMove, setCustomMove] = useState("0");
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(
    null
  );

  // Add new holding
  const [newCode, setNewCode] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newBeta, setNewBeta] = useState("1.0");

  function addHolding() {
    if (!newCode || !newValue) return;
    setHoldings([
      ...holdings,
      { code: newCode.toUpperCase(), value: Number(newValue), beta: Number(newBeta) },
    ]);
    setNewCode("");
    setNewValue("");
    setNewBeta("1.0");
  }

  function removeHolding(index: number) {
    setHoldings(holdings.filter((_, i) => i !== index));
  }

  // Model picker for "Load from model".
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [modelId, setModelId] = useState("");
  const [loadingModel, setLoadingModel] = useState(false);

  useEffect(() => {
    listModelsForPicker()
      .then((list) => {
        setModels(list);
        if (list[0]) setModelId(list[0].id);
      })
      .catch(() => {});
  }, []);

  async function loadFromModel() {
    if (!modelId) return;
    setLoadingModel(true);
    try {
      const rows = await getModelWhatIfHoldings(modelId);
      if (rows.length > 0) {
        setHoldings(rows);
        setSelectedScenario(null);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingModel(false);
    }
  }

  const marketMove = selectedScenario
    ? selectedScenario.marketMove
    : Number(customMove);

  // Calculate impact
  const totalCurrent = holdings.reduce((s, h) => s + h.value, 0);
  const impacts = holdings.map((h) => {
    const holdingMove = marketMove * h.beta;
    const newValue = h.value * (1 + holdingMove / 100);
    return {
      ...h,
      holdingMove,
      newValue,
      change: newValue - h.value,
    };
  });
  const totalNew = impacts.reduce((s, i) => s + i.newValue, 0);
  const totalChange = totalNew - totalCurrent;
  const totalChangePercent =
    totalCurrent > 0 ? (totalChange / totalCurrent) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">What-If Scenarios</h1>
        <p className="text-sm text-muted-foreground">
          Model how market moves would impact your portfolio based on each
          holding&apos;s beta sensitivity.
        </p>
      </div>

      {/* Load from model */}
      {models.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-4">
          <span className="text-sm font-medium">Load from model</span>
          <select
            aria-label="Model to load"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={loadFromModel}
            disabled={loadingModel || !modelId}
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loadingModel ? "Loading..." : "Load holdings"}
          </button>
          <span className="text-xs text-muted-foreground">
            Replaces the rows below with the instantiated model holdings.
          </span>
        </div>
      )}

      {/* Scenario selection */}
      <div className="rounded-lg border border-border p-4">
        <h2 className="mb-3 text-sm font-medium">Select Scenario</h2>
        <div className="flex flex-wrap gap-2">
          {PRESET_SCENARIOS.map((s) => (
            <button
              key={s.name}
              type="button"
              onClick={() => setSelectedScenario(s)}
              aria-pressed={selectedScenario?.name === s.name}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedScenario?.name === s.name
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
              }`}
            >
              {s.name}
            </button>
          ))}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Custom:</span>
            <input
              type="number"
              value={customMove}
              onChange={(e) => {
                setCustomMove(e.target.value);
                setSelectedScenario(null);
              }}
              aria-label="Custom market move percentage"
              className="h-8 w-20 rounded-md border border-input bg-background px-2 text-xs"
            />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
        </div>
      </div>

      {/* Impact summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Current Value</p>
          <p className="text-lg font-bold">{formatCurrency(totalCurrent)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Market Move</p>
          <p
            className={`text-lg font-bold ${marketMove >= 0 ? "text-gain" : "text-loss"}`}
          >
            {marketMove >= 0 ? "+" : ""}
            {marketMove}%
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Projected Value</p>
          <p className="text-lg font-bold">{formatCurrency(totalNew)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">P&L Impact</p>
          <p
            className={`text-lg font-bold ${totalChange >= 0 ? "text-gain" : "text-loss"}`}
          >
            {formatCurrency(totalChange)} ({formatPercent(totalChangePercent)})
          </p>
        </div>
      </div>

      {/* Holdings impact table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Code
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Current
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Beta
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Holding Move
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Projected
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                P&L
              </th>
              <th className="w-12 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {impacts.map((h, i) => (
              <tr key={i} className="hover:bg-accent/50">
                <td className="px-4 py-3 font-medium">{h.code}</td>
                <td className="px-4 py-3 text-right text-sm">
                  {formatCurrency(h.value)}
                </td>
                <td className="px-4 py-3 text-right text-sm">{h.beta.toFixed(1)}</td>
                <td
                  className={`px-4 py-3 text-right text-sm ${h.holdingMove >= 0 ? "text-gain" : "text-loss"}`}
                >
                  {h.holdingMove >= 0 ? "+" : ""}
                  {h.holdingMove.toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {formatCurrency(h.newValue)}
                </td>
                <td
                  className={`px-4 py-3 text-right text-sm ${h.change >= 0 ? "text-gain" : "text-loss"}`}
                >
                  {formatCurrency(h.change)}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => removeHolding(i)}
                    aria-label={`Remove ${h.code}`}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add holding */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          placeholder="Code"
          aria-label="Instrument code"
          className="h-9 w-20 rounded-md border border-input bg-background px-3 text-sm"
        />
        <input
          type="number"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="Value ($)"
          aria-label="Holding value"
          className="h-9 w-28 rounded-md border border-input bg-background px-3 text-sm"
        />
        <input
          type="number"
          step="0.1"
          value={newBeta}
          onChange={(e) => setNewBeta(e.target.value)}
          placeholder="Beta"
          aria-label="Beta"
          className="h-9 w-20 rounded-md border border-input bg-background px-3 text-sm"
        />
        <button
          onClick={addHolding}
          disabled={!newCode || !newValue}
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Add Holding
        </button>
      </div>

      {/* Explanation */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <h3 className="text-sm font-medium">How It Works</h3>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          <li>
            • Each holding&apos;s sensitivity to market moves is determined by
            its <strong>Beta</strong>
          </li>
          <li>
            • Beta = 1.0: moves with the market. Beta = 1.5: moves 50% more
            than market
          </li>
          <li>
            • Holding Move = Market Move × Beta (e.g. -30% market × 1.3 beta =
            -39% for that holding)
          </li>
          <li>
            • This is a simplified linear model — actual moves may differ due to
            company-specific factors
          </li>
        </ul>
      </div>
    </div>
  );
}
