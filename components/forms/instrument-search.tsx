"use client";

import { useState, useEffect, useRef } from "react";
import { searchInstruments } from "@/lib/providers/instrument-search";
import type { InstrumentSearchResult } from "@/lib/providers/market-data";
import { Search } from "lucide-react";

interface InstrumentSearchProps {
  market?: string;
  onSelect: (instrument: InstrumentSearchResult) => void;
  placeholder?: string;
}

export function InstrumentSearch({
  market,
  onSelect,
  placeholder = "Search instruments...",
}: InstrumentSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InstrumentSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (query.length < 1) {
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      const instruments = await searchInstruments(query, market);
      setResults(instruments);
      setIsOpen(instruments.length > 0);
      setLoading(false);
    }, 300);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query, market]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(instrument: InstrumentSearchResult) {
    onSelect(instrument);
    setQuery(instrument.code);
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            if (val.length < 1) {
              setResults([]);
              setIsOpen(false);
            }
          }}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
          <ul className="max-h-60 overflow-y-auto py-1">
            {results.map((result, i) => (
              <li key={`${result.code}-${result.exchange}-${i}`}>
                <button
                  type="button"
                  onClick={() => handleSelect(result)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-accent"
                >
                  <span className="font-medium">{result.code}</span>
                  <span className="flex-1 truncate text-muted-foreground">
                    {result.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {result.exchange}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
