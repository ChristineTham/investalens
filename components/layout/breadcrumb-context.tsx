"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type LabelMap = Record<string, string>;

interface BreadcrumbContextValue {
  labels: LabelMap;
  setLabel: (id: string, label: string) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

/**
 * Provides a map of dynamic breadcrumb labels (e.g. a portfolio id → its name)
 * so the breadcrumb trail can show meaningful names instead of generic labels.
 * Wraps both the breadcrumb trail and the page content in the dashboard layout.
 */
export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [labels, setLabels] = useState<LabelMap>({});

  const setLabel = useCallback((id: string, label: string) => {
    setLabels((prev) => (prev[id] === label ? prev : { ...prev, [id]: label }));
  }, []);

  return (
    <BreadcrumbContext.Provider value={{ labels, setLabel }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbLabels(): LabelMap {
  return useContext(BreadcrumbContext)?.labels ?? {};
}

/**
 * Registers a dynamic label for a path segment (typically an id). Render this
 * from a page to make the breadcrumb show a human-friendly name. Renders nothing.
 */
export function BreadcrumbLabel({ id, label }: { id: string; label: string }) {
  const ctx = useContext(BreadcrumbContext);
  const setLabel = ctx?.setLabel;

  useEffect(() => {
    setLabel?.(id, label);
  }, [id, label, setLabel]);

  return null;
}
