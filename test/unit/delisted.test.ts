import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchDelistedSecurities } from "@/lib/providers/delisted";

describe("searchDelistedSecurities", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed delisted securities from HTML", async () => {
    const mockHtml = `
      <html>
        <body>
          <table id="tablesorter_browse">
            <tbody>
              <tr>
                <td><a href="https://www.delisted.com.au/company/afterpay-limited/" title="AFTERPAY LIMITED">AFTERPAY LIMITED</a></td>
                <td>APT</td>
                <td>ASX</td>
                <td>Delisted</td>
              </tr>
              <tr>
                <td><a href="https://www.investogain.co.nz/company/amp-nz-office-trust/" title="AMP NZ OFFICE TRUST">AMP NZ OFFICE TRUST</a></td>
                <td>APT</td>
                <td>NZX</td>
                <td>Former Name</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

    // Mock fetch
    const mockResponse = {
      ok: true,
      text: async () => mockHtml,
    } as Response;
    
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse);

    const results = await searchDelistedSecurities("APT");

    expect(fetchSpy).toHaveBeenCalledTimes(2); // One for code, one for name
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      code: "APT",
      name: "AFTERPAY LIMITED (Delisted)",
      exchange: "ASX",
      type: "equity",
      isDelisted: true,
    });
    expect(results[1]).toEqual({
      code: "APT",
      name: "AMP NZ OFFICE TRUST (Former Name)",
      exchange: "NZX",
      type: "equity",
      isDelisted: true,
    });
  });

  it("handles fetch failure gracefully", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    const results = await searchDelistedSecurities("APT");
    expect(results).toEqual([]);
  });

  it("handles empty/no table html gracefully", async () => {
    const mockHtml = `<html><body><p>Your search did not return any results</p></body></html>`;
    const mockResponse = {
      ok: true,
      text: async () => mockHtml,
    } as Response;
    vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse);

    const results = await searchDelistedSecurities("ZZZZZZ");
    expect(results).toEqual([]);
  });
});
