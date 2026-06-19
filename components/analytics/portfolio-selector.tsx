"use client";

interface Portfolio {
  id: string;
  name: string;
}

interface PortfolioSelectorProps {
  portfolios: Portfolio[];
  selectedId: string;
  onChange: (id: string) => void;
}

export function PortfolioSelector({
  portfolios,
  selectedId,
  onChange,
}: PortfolioSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-muted-foreground">
        Portfolio
      </label>
      <select
        className="rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
      >
        {portfolios.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
