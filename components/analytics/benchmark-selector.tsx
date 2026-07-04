"use client";

import { useId } from "react";

import { BENCHMARKS, type BenchmarkCode } from "@/lib/constants/benchmarks";

interface BenchmarkSelectorProps {
  selectedCode: string;
  onChange: (code: string) => void;
}

export function BenchmarkSelector({
  selectedCode,
  onChange,
}: BenchmarkSelectorProps) {
  const codes = Object.keys(BENCHMARKS) as BenchmarkCode[];
  const selectId = useId();

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor={selectId}
        className="text-sm font-medium text-muted-foreground"
      >
        Benchmark
      </label>
      <select
        id={selectId}
        className="rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
        value={selectedCode}
        onChange={(e) => onChange(e.target.value)}
      >
        {codes.map((code) => (
          <option key={code} value={code}>
            {BENCHMARKS[code].name}
          </option>
        ))}
      </select>
    </div>
  );
}
