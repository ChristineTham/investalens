"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface GroupBySelectProps {
  options: { value: string; label: string }[];
  customGroups: { id: string; name: string }[];
  value: string;
  /** Value treated as the default — selecting it removes the param. */
  defaultValue: string;
}

/** Group-by selector driven by the `groupBy` search param. */
export function GroupBySelect({
  options,
  customGroups,
  value,
  defaultValue,
}: GroupBySelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === defaultValue) {
      params.delete("groupBy");
    } else {
      params.set("groupBy", next);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="group-by-select"
        className="text-sm font-medium text-muted-foreground"
      >
        Group by:
      </label>
      <select
        id="group-by-select"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        {customGroups.length > 0 && (
          <optgroup label="Custom Groups">
            {customGroups.map((g) => (
              <option key={g.id} value={`custom:${g.id}`}>
                {g.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
}
