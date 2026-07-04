"use client";

import { useState, useEffect, useRef, useId } from "react";
import { searchInstrumentsAction } from "@/lib/actions/search";
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
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (query.length < 1) {
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const instruments = await searchInstrumentsAction(query, market);
        setResults(instruments);
        setIsOpen(instruments.length > 0);
        setActiveIndex(-1);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Search failed";
        setError(message);
        setResults([]);
        setIsOpen(false);
        setActiveIndex(-1);
      } finally {
        setLoading(false);
      }
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

  useEffect(() => {
    if (isOpen && activeIndex >= 0) {
      document
        .getElementById(`${listboxId}-option-${activeIndex}`)
        ?.scrollIntoView({ block: "nearest" });
    }
  }, [isOpen, activeIndex, listboxId]);

  function handleSelect(instrument: InstrumentSearchResult) {
    onSelect(instrument);
    setQuery(instrument.code);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen && results.length > 0) {
        setIsOpen(true);
        setActiveIndex(0);
      } else if (isOpen && results.length > 0) {
        setActiveIndex((i) => (i + 1) % results.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (isOpen && results.length > 0) {
        setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
      }
    } else if (e.key === "Enter") {
      if (isOpen && activeIndex >= 0 && activeIndex < results.length) {
        e.preventDefault();
        handleSelect(results[activeIndex]);
      }
    } else if (e.key === "Escape") {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-label={placeholder}
          aria-activedescendant={
            isOpen && activeIndex >= 0
              ? `${listboxId}-option-${activeIndex}`
              : undefined
          }
          value={query}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            setError(null);
            if (val.length < 1) {
              setResults([]);
              setIsOpen(false);
              setActiveIndex(-1);
            }
          }}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex h-10 w-full rounded-md border border-input bg-background py-2 pr-3 pl-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
        {loading && (
          <div className="absolute top-1/2 right-3 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-2 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive"
        >
          {error}
        </div>
      )}

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Instrument search results"
            className="max-h-60 overflow-y-auto py-1"
          >
            {results.map((result, i) => (
              <li
                key={`${result.code}-${result.exchange}-${i}`}
                id={`${listboxId}-option-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-accent ${
                  i === activeIndex ? "bg-accent" : ""
                }`}
              >
                <span className="font-medium">{result.code}</span>
                <span className="flex-1 truncate text-muted-foreground">
                  {result.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {result.exchange}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
