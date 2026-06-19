import { getCached, setCache, CACHE_TTL } from "./analytics-cache";

export interface FamaFrenchFactors {
  dates: string[];
  mktRf: number[];
  smb: number[];
  hml: number[];
  rf: number[];
  mom?: number[];
}

const KENNETH_FRENCH_BASE =
  "https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/ftp";

/**
 * Fetch Fama-French 3-factor daily data from Kenneth French Data Library.
 * Returns daily factor returns (Mkt-RF, SMB, HML, RF) as percentages.
 */
export async function getFamaFrenchFactors(
  startDate?: Date,
  endDate?: Date
): Promise<FamaFrenchFactors> {
  const cacheKey = `factor-ff3-${startDate?.toISOString() || "all"}-${endDate?.toISOString() || "all"}`;
  const cached = getCached<FamaFrenchFactors>(cacheKey);
  if (cached) return cached;

  const rawData = await fetchFrenchCSV("F-F_Research_Data_Factors_daily_CSV.zip");

  const factors = parseFrenchFactorData(rawData, startDate, endDate);
  setCache(cacheKey, factors, CACHE_TTL.factorData);
  return factors;
}

/**
 * Fetch Momentum (UMD) factor daily data.
 */
export async function getMomentumFactor(
  startDate?: Date,
  endDate?: Date
): Promise<{ dates: string[]; mom: number[] }> {
  const cacheKey = `factor-mom-${startDate?.toISOString() || "all"}-${endDate?.toISOString() || "all"}`;
  const cached = getCached<{ dates: string[]; mom: number[] }>(cacheKey);
  if (cached) return cached;

  const rawData = await fetchFrenchCSV("F-F_Momentum_Factor_daily_CSV.zip");

  const lines = rawData
    .split("\n")
    .filter((l) => /^\s*\d{8}/.test(l));

  const dates: string[] = [];
  const mom: number[] = [];

  for (const line of lines) {
    const parts = line.trim().split(/[,\s]+/);
    if (parts.length < 2) continue;

    const dateStr = parts[0];
    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const day = dateStr.slice(6, 8);
    const date = `${year}-${month}-${day}`;

    if (startDate && new Date(date) < startDate) continue;
    if (endDate && new Date(date) > endDate) continue;

    dates.push(date);
    mom.push(parseFloat(parts[1]) / 100);
  }

  const result = { dates, mom };
  setCache(cacheKey, result, CACHE_TTL.factorData);
  return result;
}

/**
 * Fetch and decompress a CSV from Kenneth French Data Library.
 * The library serves zip files containing a single CSV.
 */
async function fetchFrenchCSV(filename: string): Promise<string> {
  const cacheKey = `factor-raw-${filename}`;
  const cached = getCached<string>(cacheKey);
  if (cached) return cached;

  const url = `${KENNETH_FRENCH_BASE}/${filename}`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Kenneth French data: ${response.status} ${response.statusText}`
    );
  }

  const buffer = await response.arrayBuffer();

  // Decompress ZIP — the zip contains a single CSV file
  // Use built-in DecompressionStream for the raw deflated data inside zip
  const bytes = new Uint8Array(buffer);
  const csvContent = await extractCSVFromZip(bytes);

  setCache(cacheKey, csvContent, CACHE_TTL.factorData);
  return csvContent;
}

/**
 * Minimal ZIP extraction — Kenneth French zips have one CSV file.
 * Extracts the first file from a zip archive.
 */
async function extractCSVFromZip(zipBytes: Uint8Array): Promise<string> {
  // Local file header signature = 0x04034b50
  const sig = zipBytes[0] | (zipBytes[1] << 8) | (zipBytes[2] << 16) | (zipBytes[3] << 24);
  if (sig !== 0x04034b50) {
    throw new Error("Invalid ZIP file");
  }

  const compressionMethod = zipBytes[8] | (zipBytes[9] << 8);
  const compressedSize = zipBytes[18] | (zipBytes[19] << 8) | (zipBytes[20] << 16) | (zipBytes[21] << 24);
  const fileNameLength = zipBytes[26] | (zipBytes[27] << 8);
  const extraFieldLength = zipBytes[28] | (zipBytes[29] << 8);

  const dataStart = 30 + fileNameLength + extraFieldLength;
  const compressedData = zipBytes.slice(dataStart, dataStart + compressedSize);

  if (compressionMethod === 0) {
    // Stored (no compression)
    return new TextDecoder().decode(compressedData);
  }

  if (compressionMethod === 8) {
    // Deflated — use DecompressionStream
    const ds = new DecompressionStream("deflate-raw");
    const writer = ds.writable.getWriter();
    writer.write(compressedData);
    writer.close();

    const reader = ds.readable.getReader();

    const decompressed = await readAllChunks(reader);
    return new TextDecoder().decode(decompressed);
  }

  throw new Error(`Unsupported ZIP compression method: ${compressionMethod}`);
}

async function readAllChunks(
  reader: ReadableStreamDefaultReader<Uint8Array>
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    totalLength += value.length;
  }

  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function parseFrenchFactorData(
  rawData: string,
  startDate?: Date,
  endDate?: Date
): FamaFrenchFactors {
  const lines = rawData
    .split("\n")
    .filter((l) => /^\s*\d{8}/.test(l));

  const dates: string[] = [];
  const mktRf: number[] = [];
  const smb: number[] = [];
  const hml: number[] = [];
  const rf: number[] = [];

  for (const line of lines) {
    const parts = line.trim().split(/[,\s]+/);
    if (parts.length < 5) continue;

    const dateStr = parts[0];
    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const day = dateStr.slice(6, 8);
    const date = `${year}-${month}-${day}`;

    if (startDate && new Date(date) < startDate) continue;
    if (endDate && new Date(date) > endDate) continue;

    dates.push(date);
    mktRf.push(parseFloat(parts[1]) / 100);
    smb.push(parseFloat(parts[2]) / 100);
    hml.push(parseFloat(parts[3]) / 100);
    rf.push(parseFloat(parts[4]) / 100);
  }

  return { dates, mktRf, smb, hml, rf };
}
