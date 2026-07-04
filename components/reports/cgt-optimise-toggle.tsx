"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface CgtOptimiseToggleProps {
  enabled: boolean;
  /** True when no single portfolio is selected (comparison needs one). */
  disabled?: boolean;
}

export function CgtOptimiseToggle({
  enabled,
  disabled,
}: CgtOptimiseToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function toggle(checked: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    if (checked) params.set("optimise", "1");
    else params.delete("optimise");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/20 px-3 py-2">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => toggle(e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        Optimise: compare sale-allocation methods
      </label>
      {disabled && (
        <span className="text-xs text-muted-foreground">
          Select a single portfolio to run the comparison.
        </span>
      )}
    </div>
  );
}
