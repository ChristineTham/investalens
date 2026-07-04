"use client";

import { useEffect, useState } from "react";
import {
  listModelsForPicker,
  runModelHealthCheck,
} from "@/lib/actions/model";
import { ModelHealthBadge } from "@/app/(dashboard)/models/_components/model-health-badge";
import type { ModelCheckResult } from "@/lib/services/share-checker";

export function ModelChecker() {
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [modelId, setModelId] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ModelCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listModelsForPicker()
      .then((list) => {
        setModels(list);
        if (list[0]) setModelId(list[0].id);
      })
      .catch(() => {});
  }, []);

  async function run() {
    if (!modelId) return;
    setRunning(true);
    setError(null);
    try {
      setResult(await runModelHealthCheck(modelId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check failed");
    } finally {
      setRunning(false);
    }
  }

  if (models.length === 0) return null;

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-2 text-sm font-medium">Check a model</h2>
        <select
          aria-label="Model to check"
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
          onClick={run}
          disabled={running || !modelId}
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {running ? "Checking..." : "Run checks"}
        </button>
        {result && (
          <ModelHealthBadge
            level={result.health}
            reasons={result.healthReasons}
          />
        )}
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && (
        <ul className="space-y-2 text-sm">
          {result.invalidConstituents.map((c) => (
            <li
              key={`inv-${c.holding}`}
              className="rounded-md border border-destructive/30 bg-destructive/5 p-2"
            >
              <span className="font-medium">{c.holding}</span> — {c.reason}
            </li>
          ))}
          {result.concentration.map((c) => (
            <li
              key={`con-${c.holding}`}
              className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2"
            >
              <span className="font-medium">{c.holding}</span> is{" "}
              {(c.weight * 100).toFixed(1)}% of the model (over{" "}
              {(c.threshold * 100).toFixed(0)}% threshold)
            </li>
          ))}
          {result.missingData.map((c) => (
            <li
              key={`miss-${c.holding}`}
              className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2"
            >
              <span className="font-medium">{c.holding}</span> — {c.issue}
            </li>
          ))}
          {result.invalidConstituents.length === 0 &&
            result.concentration.length === 0 &&
            result.missingData.length === 0 && (
              <li className="text-muted-foreground">
                No issues found for this model.
              </li>
            )}
        </ul>
      )}
    </div>
  );
}
