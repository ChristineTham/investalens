import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchInstruments } from "@/lib/providers/instrument-search";
import { yahooFinance } from "@/lib/providers/yahoo-finance";
import { searchDelistedSecurities } from "@/lib/providers/delisted";

vi.mock("@/lib/providers/yahoo-finance", () => ({
  yahooFinance: {
    searchInstruments: vi.fn(),
  },
}));

vi.mock("@/lib/providers/delisted", () => ({
  searchDelistedSecurities: vi.fn(),
}));

describe("searchInstruments", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns Yahoo Finance results if found", async () => {
    const mockYahooResults = [
      { code: "BHP", name: "BHP Group", exchange: "ASX", type: "equity" },
    ];
    vi.mocked(yahooFinance.searchInstruments).mockResolvedValue(mockYahooResults);

    const results = await searchInstruments("BHP", "ASX");

    expect(yahooFinance.searchInstruments).toHaveBeenCalledWith("BHP", "ASX");
    expect(searchDelistedSecurities).not.toHaveBeenCalled();
    expect(results).toEqual(mockYahooResults);
  });

  it("calls delisted fallback if Yahoo Finance returns empty and market is ASX", async () => {
    vi.mocked(yahooFinance.searchInstruments).mockResolvedValue([]);
    const mockDelistedResults = [
      { code: "APT", name: "Afterpay Limited", exchange: "ASX", type: "equity", isDelisted: true },
    ];
    vi.mocked(searchDelistedSecurities).mockResolvedValue(mockDelistedResults);

    const results = await searchInstruments("APT", "ASX");

    expect(yahooFinance.searchInstruments).toHaveBeenCalledWith("APT", "ASX");
    expect(searchDelistedSecurities).toHaveBeenCalledWith("APT");
    expect(results).toEqual(mockDelistedResults);
  });

  it("calls delisted fallback if Yahoo Finance returns empty and market is undefined", async () => {
    vi.mocked(yahooFinance.searchInstruments).mockResolvedValue([]);
    const mockDelistedResults = [
      { code: "APT", name: "Afterpay Limited", exchange: "ASX", type: "equity", isDelisted: true },
    ];
    vi.mocked(searchDelistedSecurities).mockResolvedValue(mockDelistedResults);

    const results = await searchInstruments("APT", undefined);

    expect(yahooFinance.searchInstruments).toHaveBeenCalledWith("APT", undefined);
    expect(searchDelistedSecurities).toHaveBeenCalledWith("APT");
    expect(results).toEqual(mockDelistedResults);
  });

  it("does not call delisted fallback if Yahoo Finance returns empty but market is non-ASX", async () => {
    vi.mocked(yahooFinance.searchInstruments).mockResolvedValue([]);

    const results = await searchInstruments("AAPL", "NASDAQ");

    expect(yahooFinance.searchInstruments).toHaveBeenCalledWith("AAPL", "NASDAQ");
    expect(searchDelistedSecurities).not.toHaveBeenCalled();
    expect(results).toEqual([]);
  });
});
