"use client";

import { useState } from "react";
import { enableDRP, disableDRP } from "@/lib/actions/drp";

interface DrpToggleProps {
  holdingId: string;
  enabled: boolean;
}

export function DrpToggle({ holdingId, enabled }: DrpToggleProps) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    try {
      if (isEnabled) {
        await disableDRP(holdingId);
        setIsEnabled(false);
      } else {
        await enableDRP(holdingId);
        setIsEnabled(true);
      }
    } catch {
      // revert on error
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        isEnabled ? "bg-rosely-teal" : "bg-muted"
      } disabled:opacity-50`}
      title={isEnabled ? "DRP enabled – click to disable" : "DRP disabled – click to enable"}
      aria-label={`Dividend Reinvestment Plan: ${isEnabled ? "enabled" : "disabled"}`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
          isEnabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
