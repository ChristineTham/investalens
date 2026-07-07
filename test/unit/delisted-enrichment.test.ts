import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCompanyUrl, getDelistedCompanyDetails } from "@/lib/providers/delisted";

describe("getCompanyUrl", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("finds company URL matching code exactly", async () => {
    const mockHtml = `
      <html>
        <body>
          <table id="tablesorter_browse">
            <tbody>
              <tr>
                <td><a href="/company/afterpay-limited/" title="AFTERPAY LIMITED">AFTERPAY LIMITED</a></td>
                <td>APT</td>
                <td>ASX</td>
                <td>Delisted</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

    const mockResponse = {
      ok: true,
      text: async () => mockHtml,
    } as Response;
    
    vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse);

    const url = await getCompanyUrl("APT");
    expect(url).toBe("https://www.delisted.com.au/company/afterpay-limited/");
  });

  it("returns null if no exact match", async () => {
    const mockHtml = `
      <html>
        <body>
          <table id="tablesorter_browse">
            <tbody>
              <tr>
                <td><a href="/company/other-limited/" title="OTHER LIMITED">OTHER LIMITED</a></td>
                <td>OTH</td>
                <td>ASX</td>
                <td>Delisted</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

    const mockResponse = {
      ok: true,
      text: async () => mockHtml,
    } as Response;
    
    vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse);

    const url = await getCompanyUrl("APT");
    expect(url).toBeNull();
  });
});

describe("getDelistedCompanyDetails", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("parses company page details correctly", async () => {
    const mockHtml = `
      <html>
        <body>
          <table>
            <tr><td><strong>Name:</strong></td><td>AFTERPAY LIMITED (APT)</td></tr>
            <tr><td><strong>ISIN:</strong></td><td>AU000000APT1</td></tr>
            <tr><td><strong>Date of Listing:</strong></td><td>29 June 2017</td></tr>
            <tr><td><strong>Date of Delisting:</strong></td><td>02 February 2022</td></tr>
          </table>
          <p><strong>ACN*: </strong>618 280 649<strong>ABN:</strong> 30 618 280 649</p>
          <p><strong>Legal Status:</strong></p>To our knowledge this entity was the subject of a takeover.<br>
          <b>Sector:</b>&nbsp;Software & Services<br>
          <b>Activities:</b>&nbsp;Technology software and services
          
          <div id="newsEvents">
            <table>
              <tr>
                <td><p>delisted at entity's request under Listing Rule 17.11</p></td>
                <td>02/02/2022</td>
              </tr>
            </table>
          </div>

          <div id="formerNames">
            <table>
              <tr>
                <td>AFTERPAY TOUCH GROUP LIMITED</td>
                <td></td>
                <td>04/12/2019</td>
              </tr>
            </table>
          </div>
        </body>
      </html>
    `;

    const mockResponse = {
      ok: true,
      text: async () => mockHtml,
    } as Response;
    
    vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse);

    const details = await getDelistedCompanyDetails("https://www.delisted.com.au/company/afterpay-limited/");
    expect(details).not.toBeNull();
    expect(details?.longName).toBe("AFTERPAY LIMITED");
    expect(details?.isin).toBe("AU000000APT1");
    expect(details?.listingDate).toBe("29 June 2017");
    expect(details?.delistingDate).toBe("02 February 2022");
    expect(details?.sector).toBe("Software & Services");
    expect(details?.activities).toBe("Technology software and services");
    expect(details?.acn).toBe("618 280 649");
    expect(details?.abn).toBe("30 618 280 649");
    expect(details?.legalStatus).toBe("To our knowledge this entity was the subject of a takeover.");
    expect(details?.newsItems).toHaveLength(1);
    expect(details?.newsItems[0].summary).toBe("delisted at entity's request under Listing Rule 17.11");
    expect(details?.newsItems[0].publishedAt).toBe("02/02/2022");
    expect(details?.formerNames).toHaveLength(1);
    expect(details?.formerNames[0].name).toBe("AFTERPAY TOUCH GROUP LIMITED");
    expect(details?.formerNames[0].to).toBe("04/12/2019");
  });
});
