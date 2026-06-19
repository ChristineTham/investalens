import { getPortfolioReturnsMatrix } from "./analytics-data";

export class AnalyticsClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
  }

  async callFunction<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}/api/analytics/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.detail || `Analytics function failed: ${response.status}`
      );
    }
    return response.json();
  }

  async runAnalysis<T>(
    endpoint: string,
    portfolioId: string,
    dateRange: "1Y" | "3Y" | "5Y" | "10Y" | "MAX",
    config: Record<string, unknown> = {}
  ): Promise<T> {
    const matrix = await getPortfolioReturnsMatrix(portfolioId, dateRange);
    return this.callFunction<T>(endpoint, { ...matrix, config });
  }
}

export const analyticsClient = new AnalyticsClient();
