"use client";

import { useState } from "react";
import { calculateFIRE, type FIREInput, type FIREResult } from "@/lib/calculations/fire";
import { MetricCard } from "@/components/analytics/metric-card";
import { GrowthChart } from "@/components/charts/growth-chart";
import { formatCurrency } from "@/lib/utils";

const DEFAULTS: FIREInput = {
  currentAge: 35,
  retirementAge: 60,
  currentPortfolioValue: 200000,
  annualContribution: 30000,
  contributionGrowthRate: 0.03,
  expectedReturnRate: 0.08,
  inflationRate: 0.03,
  annualExpenses: 60000,
  expenseGrowthRate: 0.03,
  withdrawalRate: 0.04,
  superBalance: 50000,
  superAccessAge: 60,
};

export default function FIREPage() {
  const [input, setInput] = useState<FIREInput>(DEFAULTS);
  const [result, setResult] = useState<FIREResult | null>(null);
  const [includeSuper, setIncludeSuper] = useState(false);

  function handleCalculate() {
    const fireInput = includeSuper ? input : { ...input, superBalance: 0 };
    setResult(calculateFIRE(fireInput));
  }

  function updateField<K extends keyof FIREInput>(key: K, value: FIREInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  const projectionDates = result?.yearByYearProjection.map((y) => String(y.year)) ?? [];
  const projectionValues = result?.yearByYearProjection.map((y) => y.portfolioValue) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">FIRE Calculator</h1>
        <p className="text-sm text-muted-foreground">
          Financial Independence, Retire Early — projection and scenario analysis
        </p>
      </div>

      <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-2 lg:grid-cols-3">
        <InputField label="Current Age" value={input.currentAge} onChange={(v) => updateField("currentAge", v)} />
        <InputField label="Retirement Age" value={input.retirementAge} onChange={(v) => updateField("retirementAge", v)} />
        <InputField label="Portfolio Value ($)" value={input.currentPortfolioValue} onChange={(v) => updateField("currentPortfolioValue", v)} />
        <InputField label="Annual Contribution ($)" value={input.annualContribution} onChange={(v) => updateField("annualContribution", v)} />
        <InputField label="Contribution Growth (%)" value={input.contributionGrowthRate * 100} onChange={(v) => updateField("contributionGrowthRate", v / 100)} step={0.5} />
        <InputField label="Expected Return (%)" value={input.expectedReturnRate * 100} onChange={(v) => updateField("expectedReturnRate", v / 100)} step={0.5} />
        <InputField label="Inflation (%)" value={input.inflationRate * 100} onChange={(v) => updateField("inflationRate", v / 100)} step={0.5} />
        <InputField label="Annual Expenses ($)" value={input.annualExpenses} onChange={(v) => updateField("annualExpenses", v)} />
        <InputField label="Expense Growth (%)" value={input.expenseGrowthRate * 100} onChange={(v) => updateField("expenseGrowthRate", v / 100)} step={0.5} />
        <InputField label="Withdrawal Rate (%)" value={input.withdrawalRate * 100} onChange={(v) => updateField("withdrawalRate", v / 100)} step={0.5} />

        <div className="col-span-full flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeSuper}
              onChange={(e) => setIncludeSuper(e.target.checked)}
              className="rounded border"
            />
            Include Superannuation (AU)
          </label>
          {includeSuper && (
            <>
              <InputField label="Super Balance ($)" value={input.superBalance ?? 0} onChange={(v) => updateField("superBalance", v)} />
              <InputField label="Super Access Age" value={input.superAccessAge ?? 60} onChange={(v) => updateField("superAccessAge", v)} />
            </>
          )}
        </div>

        <div className="col-span-full">
          <button
            type="button"
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            onClick={handleCalculate}
          >
            Calculate
          </button>
        </div>
      </div>

      {result && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            <MetricCard label="FIRE Number" value={formatCurrency(result.fireNumber)} />
            <MetricCard label="Years to FIRE" value={result.yearsToFIRE} />
            <MetricCard label="FIRE Age" value={result.fireAge} />
            <MetricCard label="Coast FIRE" value={formatCurrency(result.coastFIRENumber)} description="Stop contributing, growth reaches FIRE" />
            <MetricCard label="Safe Withdrawal" value={formatCurrency(result.safeWithdrawalAmount)} suffix="/yr" />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">Portfolio Projection</h3>
            <GrowthChart dates={projectionDates} portfolioValues={projectionValues} portfolioLabel="Portfolio Value" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Pessimistic (−2%)</p>
              <p className="text-lg font-bold">Age {result.scenarios.pessimistic.fireAge}</p>
            </div>
            <div className="rounded-lg border border-primary p-3">
              <p className="text-xs text-muted-foreground">Baseline</p>
              <p className="text-lg font-bold">Age {result.scenarios.baseline.fireAge}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Optimistic (+2%)</p>
              <p className="text-lg font-bold">Age {result.scenarios.optimistic.fireAge}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
      />
    </div>
  );
}
