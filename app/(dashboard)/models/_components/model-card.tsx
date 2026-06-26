import Link from "next/link";
import { Target, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ModelWithConstituents } from "@/lib/services/model-list";

const CATEGORY_LABELS: Record<string, string> = {
  conservative: "Conservative",
  moderately_conservative: "Moderately Conservative",
  balanced: "Balanced",
  growth: "Growth",
  high_growth: "High Growth",
  high_yield: "High Yield",
  index: "Index",
};

export function ModelCard({ model }: { model: ModelWithConstituents }) {
  const top = [...model.constituents]
    .sort((a, b) => Number(b.targetWeight) - Number(a.targetWeight))
    .slice(0, 4);

  return (
    <Link href={`/models/${model.id}`} className="block">
      <Card className="h-full transition-colors hover:ring-primary/40">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" aria-hidden />
              {model.name}
            </CardTitle>
            {model.isSystem && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" aria-hidden />
                System
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {CATEGORY_LABELS[model.category] ?? model.category}
            {model.provider ? ` · ${model.provider}` : ""} ·{" "}
            {model.constituents.length} holding
            {model.constituents.length === 1 ? "" : "s"}
          </p>
        </CardHeader>
        <CardContent>
          {model.description && (
            <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
              {model.description}
            </p>
          )}
          <ul className="space-y-1 text-sm">
            {top.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">
                  {c.instrument.code}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {(Number(c.targetWeight) * 100).toFixed(1)}%
                </span>
              </li>
            ))}
            {model.constituents.length > top.length && (
              <li className="text-xs text-muted-foreground">
                +{model.constituents.length - top.length} more
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </Link>
  );
}
