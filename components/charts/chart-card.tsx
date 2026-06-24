"use client";

import { useState, type ReactNode } from "react";
import { Maximize2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ChartCardProps {
  title: string;
  description?: string;
  /** Optional header controls (e.g. a benchmark selector). */
  actions?: ReactNode;
  /** Inline render height in pixels. Defaults to 280. */
  height?: number;
  /** Expanded (modal) render height in pixels. Defaults to 560. */
  expandedHeight?: number;
  /** Allow the card to span more grid columns. */
  className?: string;
  /** Render the chart for the given height (inline vs. expanded). */
  children: (height: number) => ReactNode;
}

/**
 * Card wrapper for a chart with a title, optional header controls, and a
 * maximise button that opens the same chart in a larger modal. The chart is
 * supplied as a render function so it can be sized differently inline vs.
 * expanded.
 */
export function ChartCard({
  title,
  description,
  actions,
  height = 280,
  expandedHeight = 560,
  className,
  children,
}: ChartCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`flex flex-col rounded-lg border border-border bg-card ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border p-4">
        <div className="min-w-0">
          <h3 className="font-medium">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Expand ${title}`}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="min-w-0 flex-1 p-4">{children(height)}</div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {actions && (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          )}
          <div className="min-w-0">{children(expandedHeight)}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
