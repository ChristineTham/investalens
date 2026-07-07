import type { InstrumentSearchResult } from "./market-data";

/**
 * Parses the HTML response from delisted.com.au search pages.
 */
function parseDelistedHtml(html: string): InstrumentSearchResult[] {
  const tableRegex = /<table[^>]*id=["']tablesorter_browse["'][^>]*>([\s\S]*?)<\/table>/i;
  const tableMatch = html.match(tableRegex);
  if (!tableMatch) return [];

  const tableContent = tableMatch[1];
  const tbodyRegex = /<tbody>([\s\S]*?)<\/tbody>/i;
  const tbodyMatch = tableContent.match(tbodyRegex);
  const bodyContent = tbodyMatch ? tbodyMatch[1] : tableContent;

  const rowRegex = /<tr>([\s\S]*?)<\/tr>/gi;
  const cellRegex = /<td>([\s\S]*?)<\/td>/gi;

  const results: InstrumentSearchResult[] = [];
  let rowMatch;

  while ((rowMatch = rowRegex.exec(bodyContent)) !== null) {
    const rowHtml = rowMatch[1];
    const cells: string[] = [];
    let cellMatch;
    cellRegex.lastIndex = 0;
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      cells.push(cellMatch[1].trim());
    }

    if (cells.length >= 4) {
      const linkMatch = cells[0].match(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
      const name = linkMatch
        ? linkMatch[2].replace(/<[^>]*>/g, "").trim()
        : cells[0].replace(/<[^>]*>/g, "").trim();

      const code = cells[1].replace(/<[^>]*>/g, "").trim();
      const exchange = cells[2].replace(/<[^>]*>/g, "").trim();
      const status = cells[3].replace(/<[^>]*>/g, "").trim();

      results.push({
        code,
        name: `${name} (${status})`,
        exchange: exchange || "ASX",
        type: "equity",
        isDelisted: true,
      });
    }
  }

  return results;
}

/**
 * Searches delisted.com.au for securities matching the query by code and name.
 */
export async function searchDelistedSecurities(
  query: string
): Promise<InstrumentSearchResult[]> {
  if (!query || query.trim().length === 0) return [];

  const cleanQuery = query.trim();

  const codeUrl = `https://www.delisted.com.au/company/company_search_by_code/?keywords_code=${encodeURIComponent(cleanQuery)}`;
  const nameUrl = `https://www.delisted.com.au/company/company_search_by_name/?keywords=${encodeURIComponent(cleanQuery)}`;

  try {
    // Perform both code and name searches in parallel
    const [codeRes, nameRes] = await Promise.all([
      fetch(codeUrl).catch(() => null),
      fetch(nameUrl).catch(() => null),
    ]);

    const codeHtml = codeRes && codeRes.ok ? await codeRes.text() : "";
    const nameHtml = nameRes && nameRes.ok ? await nameRes.text() : "";

    const codeResults = parseDelistedHtml(codeHtml);
    const nameResults = parseDelistedHtml(nameHtml);

    // Combine results
    const combined = [...codeResults, ...nameResults];

    // De-duplicate by code + exchange + name
    const seen = new Set<string>();
    const uniqueResults: InstrumentSearchResult[] = [];

    for (const item of combined) {
      const key = `${item.code.toUpperCase()}-${item.exchange.toUpperCase()}-${item.name.toUpperCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueResults.push(item);
      }
    }

    return uniqueResults;
  } catch (error) {
    console.warn(`Failed to search delisted.com.au for "${query}":`, error);
    return [];
  }
}

/**
 * Searches delisted.com.au for the company's code and returns its details page URL.
 */
export async function getCompanyUrl(code: string): Promise<string | null> {
  if (!code) return null;
  const cleanCode = code.trim().toUpperCase();
  const url = `https://www.delisted.com.au/company/company_search_by_code/?keywords_code=${encodeURIComponent(cleanCode)}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "InvestaLens/1.0" } });
    if (!res.ok) return null;
    const html = await res.text();
    const tableRegex = /<table[^>]*id=["']tablesorter_browse["'][^>]*>([\s\S]*?)<\/table>/i;
    const tableMatch = html.match(tableRegex);
    if (!tableMatch) return null;

    const tableContent = tableMatch[1];
    const rowRegex = /<tr>([\s\S]*?)<\/tr>/gi;
    const cellRegex = /<td>([\s\S]*?)<\/td>/gi;
    
    let rowMatch;
    while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
      const rowHtml = rowMatch[1];
      const cells: string[] = [];
      let cellMatch;
      cellRegex.lastIndex = 0;
      while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
        cells.push(cellMatch[1].trim());
      }
      if (cells.length >= 4) {
        const rowCode = cells[1].replace(/<[^>]*>/g, "").trim().toUpperCase();
        if (rowCode === cleanCode) {
          const linkMatch = cells[0].match(/<a[^>]*href=["']([^"']+)["'][^>]*>/i);
          if (linkMatch) {
            const path = linkMatch[1];
            return path.startsWith("http") ? path : `https://www.delisted.com.au${path}`;
          }
        }
      }
    }
  } catch (error) {
    console.warn(`Failed to get company URL for ${code} from delisted.com.au:`, error);
  }
  return null;
}

export interface ScrapedCompanyDetails {
  longName: string | null;
  isin: string | null;
  listingDate: string | null;
  delistingDate: string | null;
  sector: string | null;
  activities: string | null;
  acn: string | null;
  abn: string | null;
  legalStatus: string | null;
  newsItems: Array<{
    title: string;
    summary: string;
    publisher: string;
    link: string;
    publishedAt: string;
  }>;
  formerNames: Array<{
    name: string;
    from: string;
    to: string;
  }>;
}

/**
 * Scrapes detailed company information from delisted.com.au company page.
 */
export async function getDelistedCompanyDetails(companyUrl: string): Promise<ScrapedCompanyDetails | null> {
  try {
    const res = await fetch(companyUrl, { headers: { "User-Agent": "InvestaLens/1.0" } });
    if (!res.ok) return null;
    const html = await res.text();

    const nameMatch = html.match(/<strong>Name:<\/strong><\/td><td>([\s\S]*?)<\/td>/i);
    const longName = nameMatch
      ? nameMatch[1].replace(/<[^>]*>/g, "").replace(/\([^)]+\)/g, "").trim()
      : null;

    const isinMatch = html.match(/<strong>ISIN:<\/strong><\/td><td>([^<]+)<\/td>/i);
    const isin = isinMatch ? isinMatch[1].trim() : null;

    const listingDateMatch = html.match(/<strong>Date of Listing:<\/strong><\/td><td>([^<]+)<\/td>/i);
    const listingDate = listingDateMatch ? listingDateMatch[1].trim() : null;

    const delistingDateMatch = html.match(/<strong>Date of Delisting:<\/strong><\/td><td>([^<]+)<\/td>/i);
    const delistingDate = delistingDateMatch ? delistingDateMatch[1].trim() : null;

    const sectorMatch = html.match(/<b>Sector:<\/b>\s*&nbsp;\s*([^<]+)/i);
    const sector = sectorMatch ? sectorMatch[1].trim() : null;

    const activitiesMatch = html.match(/<b>Activities:<\/b>\s*&nbsp;\s*([^<]+)/i);
    const activities = activitiesMatch ? activitiesMatch[1].trim() : null;

    const acnMatch = html.match(/ACN\*[^<]*?<\/strong>\s*([^<&\n]+)/i);
    const acn = acnMatch ? acnMatch[1].trim() : null;

    const abnMatch = html.match(/ABN[^<]*?<\/strong>\s*([^<&\n]+)/i);
    const abn = abnMatch ? abnMatch[1].trim() : null;

    // Compile legal status text
    const legalMatch = html.match(/Legal Status:<\/strong><\/p>([\s\S]*?)(?:<br>|<p>|$)/i);
    const legalStatus = legalMatch ? legalMatch[1].replace(/<[^>]*>/g, "").trim() : null;

    // News and Events
    const newsEventsMatch = html.match(/<div[^>]*id=["']newsEvents["'][^>]*>([\s\S]*?)<\/div>/i);
    const newsItems: ScrapedCompanyDetails["newsItems"] = [];
    if (newsEventsMatch) {
      const rowsContent = newsEventsMatch[1];
      const rowRegex = /<tr>([\s\S]*?)<\/tr>/gi;
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let rowMatch;
      while ((rowMatch = rowRegex.exec(rowsContent)) !== null) {
        const rowHtml = rowMatch[1];
        const cells: string[] = [];
        let cellMatch;
        cellRegex.lastIndex = 0;
        while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
          cells.push(cellMatch[1].trim());
        }
        if (cells.length >= 2) {
          const summary = cells[0].replace(/<[^>]*>/g, "").trim();
          const dateStr = cells[1].replace(/<[^>]*>/g, "").trim();
          newsItems.push({
            title: summary.substring(0, 100),
            summary,
            publisher: "deListed Australia",
            link: companyUrl,
            publishedAt: dateStr,
          });
        }
      }
    }

    // Former Names
    const formerNamesMatch = html.match(/<div[^>]*id=["']formerNames["'][^>]*>([\s\S]*?)<\/div>/i);
    const formerNames: ScrapedCompanyDetails["formerNames"] = [];
    if (formerNamesMatch) {
      const rowsContent = formerNamesMatch[1];
      const rowRegex = /<tr>([\s\S]*?)<\/tr>/gi;
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let rowMatch;
      while ((rowMatch = rowRegex.exec(rowsContent)) !== null) {
        const rowHtml = rowMatch[1];
        const cells: string[] = [];
        let cellMatch;
        cellRegex.lastIndex = 0;
        while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
          cells.push(cellMatch[1].trim());
        }
        if (cells.length >= 3) {
          const name = cells[0].replace(/<[^>]*>/g, "").trim();
          const from = cells[1].replace(/<[^>]*>/g, "").trim();
          const to = cells[2].replace(/<[^>]*>/g, "").trim();
          formerNames.push({ name, from, to });
        }
      }
    }

    return {
      longName,
      isin,
      listingDate,
      delistingDate,
      sector,
      activities,
      acn,
      abn,
      legalStatus,
      newsItems,
      formerNames,
    };
  } catch (error) {
    console.warn(`Failed to scrape company details from ${companyUrl}:`, error);
    return null;
  }
}

