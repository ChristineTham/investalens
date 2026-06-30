import { getPortfolioReturnsMatrix } from "./analytics-data";

export class AnalyticsClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.ANALYTICS_BASE_URL
      ? process.env.ANALYTICS_BASE_URL.replace(/\/$/, "")
      : process.env.NEXT_PUBLIC_APP_URL
        ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
        : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000";
  }

  async callFunction<T>(endpoint: string, data: unknown): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    // When the deployment has Deployment Protection enabled, a server-to-server
    // request to our own VERCEL_URL is rejected with 401. The automation bypass
    // secret (set automatically by Vercel when "Protection Bypass for
    // Automation" is enabled) lets these internal calls through.
    const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    if (bypass) {
      headers["x-vercel-protection-bypass"] = bypass;
    }

    const response = await fetch(`${this.baseUrl}/api/analytics/${endpoint}`, {
      method: "POST",
      headers,
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
