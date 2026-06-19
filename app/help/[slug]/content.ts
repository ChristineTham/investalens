interface HelpSection {
  heading?: string;
  content: string;
}

interface HelpPage {
  title: string;
  sections: HelpSection[];
  prev?: { slug: string; title: string };
  next?: { slug: string; title: string };
}

export const HELP_CONTENT: Record<string, HelpPage> = {
  "getting-started": {
    title: "Getting Started",
    next: { slug: "importing", title: "Adding & Importing" },
    sections: [
      {
        heading: "What You'll Do First",
        content: `<ol>
<li><strong>Create your account</strong> &mdash; Register at <code>/register</code> with name, email, and password (minimum 8 characters). Or sign in with Google OAuth.</li>
<li><strong>Create a portfolio</strong> &mdash; Click &ldquo;New Portfolio&rdquo; on <code>/portfolio</code>, choose tax residency and entity type</li>
<li><strong>Import your investments</strong> &mdash; Use the CSV import wizard or add holdings manually via instrument search</li>
<li><strong>Explore reports</strong> &mdash; Navigate to Reports or Tax for performance and tax analysis</li>
</ol>`,
      },
      {
        heading: "Key Concepts",
        content: `<table>
<tr><th>Concept</th><th>Description</th></tr>
<tr><td><strong>Portfolio</strong></td><td>Represents a single tax entity &mdash; all holdings share the same base currency, tax rules, and reporting</td></tr>
<tr><td><strong>Holding</strong></td><td>A position in a security (shares, ETF, fund, bond, custom investment)</td></tr>
<tr><td><strong>Transaction</strong></td><td>A buy, sell, dividend, coupon, or other event recorded against a holding</td></tr>
<tr><td><strong>Custom Group</strong></td><td>Your own categorisation scheme applied across reports</td></tr>
<tr><td><strong>Label</strong></td><td>A tag for filtering subsets of holdings in reports</td></tr>
</table>`,
      },
      {
        heading: "Portfolio Structure",
        content: `<ul>
<li><strong>One portfolio per tax entity</strong> &mdash; Don&rsquo;t mix personal and company holdings</li>
<li><strong>Same stock across brokers</strong> &mdash; Use separate portfolios if you hold the same security at multiple brokers</li>
<li><strong>Consolidated View</strong> &mdash; See all portfolios combined when you need the big picture</li>
</ul>`,
      },
    ],
  },

  "importing": {
    title: "Adding & Importing Investments",
    prev: { slug: "getting-started", title: "Getting Started" },
    next: { slug: "assets", title: "Supported Assets" },
    sections: [
      {
        heading: "Import Methods",
        content: `<table>
<tr><th>Method</th><th>Best For</th></tr>
<tr><td><strong>CSV Import</strong></td><td>Any broker &mdash; map columns via 5-step wizard</td></tr>
<tr><td><strong>Manual Entry</strong></td><td>One-off trades, corrections</td></tr>
<tr><td><strong>AI Importer</strong></td><td>PDFs, screenshots, non-standard formats (Gemini AI)</td></tr>
</table>`,
      },
      {
        heading: "How to Import (CSV)",
        content: `<ol>
<li>Navigate to a portfolio detail page</li>
<li>Click <strong>&ldquo;Import CSV&rdquo;</strong></li>
<li><strong>Upload</strong> &mdash; drag and drop your broker&rsquo;s CSV file</li>
<li><strong>Configure</strong> &mdash; select a broker template or set date format manually</li>
<li><strong>Map</strong> &mdash; assign CSV columns to InvestaLens fields</li>
<li><strong>Review</strong> &mdash; see parsed transactions colour-coded (green=valid, red=error, yellow=duplicate)</li>
<li><strong>Import</strong> &mdash; confirm to insert</li>
</ol>`,
      },
      {
        heading: "Supported Broker Templates",
        content: `<p>Pre-built templates: CommSec, SelfWealth, Stake, CMC Markets, CMC Invest, Bell Direct, nabtrade, FIIG Securities, Interactive Brokers. Custom templates can be created for any broker and saved for reuse.</p>`,
      },
    ],
  },

  "assets": {
    title: "Supported Assets",
    prev: { slug: "importing", title: "Adding & Importing" },
    next: { slug: "portfolio", title: "Portfolio Management" },
    sections: [
      {
        heading: "Asset Types",
        content: `<table>
<tr><th>Asset Type</th><th>Auto-Pricing</th><th>How to Add</th></tr>
<tr><td>Listed shares (60+ exchanges)</td><td>Yes</td><td>Search by ticker</td></tr>
<tr><td>ETFs and managed funds</td><td>Yes</td><td>Search by ticker</td></tr>
<tr><td>Bonds (listed &amp; unlisted)</td><td>Listed: Yes</td><td>Search or Custom Investment</td></tr>
<tr><td>Cryptocurrencies</td><td>Yes</td><td>Search by name</td></tr>
<tr><td>Term deposits, property, super</td><td>Manual</td><td>Custom Investment</td></tr>
</table>`,
      },
      {
        heading: "Bond Portfolio Features",
        content: `<ul>
<li>Yield to maturity calculation</li>
<li>Modified duration</li>
<li>Maturity ladder (sorted by days to maturity)</li>
<li>Coupon schedule generation</li>
<li>Maturity alerts (30/60/90 days before expiry)</li>
<li>Credit quality breakdown</li>
<li>Income forecasting and accrued interest tracking</li>
</ul>`,
      },
    ],
  },

  "portfolio": {
    title: "Portfolio Management",
    prev: { slug: "assets", title: "Supported Assets" },
    next: { slug: "reports", title: "Performance & Reporting" },
    sections: [
      {
        heading: "Organisation Tools",
        content: `<ul>
<li><strong>Custom Groups</strong> &mdash; Group holdings by your own categories (e.g. &ldquo;Growth&rdquo;, &ldquo;Defensive&rdquo;, &ldquo;Income&rdquo;)</li>
<li><strong>Labels</strong> &mdash; Tag holdings for filtered reporting</li>
<li><strong>Consolidated View</strong> &mdash; Aggregate view across all portfolios</li>
</ul>`,
      },
      {
        heading: "Sharing & Collaboration",
        content: `<p>Share portfolio access with advisers, accountants, or family:</p>
<ul><li><strong>Read Only</strong> &mdash; View all data</li><li><strong>Read and Write</strong> &mdash; Add/modify holdings</li><li><strong>Admin</strong> &mdash; Full access except account-level changes</li></ul>`,
      },
      {
        heading: "Key Settings",
        content: `<table>
<tr><th>Setting</th><th>Impact</th></tr>
<tr><td>Tax Residency</td><td>Determines currency, tax rules, reports</td></tr>
<tr><td>Tax Entity Type</td><td>CGT discount rate (Individual 50%, SMSF 33&frac13;%, Company 0%)</td></tr>
<tr><td>Sale Allocation Method</td><td>FIFO, LIFO, Minimise CGT, etc.</td></tr>
<tr><td>Performance Method</td><td>Simple or compound return</td></tr>
</table>`,
      },
    ],
  },

  "reports": {
    title: "Performance & Reporting",
    prev: { slug: "portfolio", title: "Portfolio Management" },
    next: { slug: "tax", title: "Tax Reporting" },
    sections: [
      {
        heading: "Performance Reports",
        content: `<ul>
<li><strong>Performance Report</strong> &mdash; Returns over any period, grouped by market/sector/custom</li>
<li><strong>Contribution Analysis</strong> &mdash; Which holdings drove performance</li>
<li><strong>Multi-Period Report</strong> &mdash; Compare across up to 5 time periods</li>
<li><strong>Sold Securities</strong> &mdash; Realised gains/losses on closed positions</li>
<li><strong>Future Income</strong> &mdash; Projected dividends (up to 36 months)</li>
<li><strong>Calendar</strong> &mdash; Month-by-month dividend schedule</li>
</ul>`,
      },
      {
        heading: "Asset Allocation Reports",
        content: `<ul>
<li><strong>Diversity Report</strong> &mdash; Weightings by sector, country, asset type, or custom group</li>
<li><strong>Exposure Report</strong> &mdash; ETF look-through to see true underlying exposure</li>
<li><strong>Drawdown Risk</strong> &mdash; Maximum drawdown and RoMaD per holding</li>
</ul>`,
      },
      {
        heading: "Risk Analysis (Share Checker)",
        content: `<p>Automated health check scanning for concentration risk, stale prices, missing cost base, and duplicate holdings. Results shown at <code>/tools/checker</code>.</p>`,
      },
    ],
  },

  "tax": {
    title: "Tax Reporting",
    prev: { slug: "reports", title: "Performance & Reporting" },
    next: { slug: "corporate-actions", title: "Corporate Actions" },
    sections: [
      {
        heading: "Available Tax Reports",
        content: `<ul>
<li><strong>Taxable Income Report</strong> &mdash; Dividend/distribution income mapped to ATO form codes</li>
<li><strong>CGT Report</strong> &mdash; Realised capital gains with discount, losses, parcel-level breakdown</li>
<li><strong>Unrealised CGT Report</strong> &mdash; Hypothetical tax liability if positions sold today</li>
<li><strong>Historical Cost Report</strong> &mdash; Opening/closing cost base for accounting</li>
</ul>`,
      },
      {
        heading: "Key Features",
        content: `<ul>
<li>5 sale allocation methods (FIFO, LIFO, Minimise Capital Gain, Maximise Capital Gain, Minimise CGT)</li>
<li>CGT discount &mdash; 50% individual, 33&frac13;% SMSF, 0% company</li>
<li>CGT parcel matcher &mdash; Compare all 5 methods to find optimal allocation</li>
</ul>`,
      },
    ],
  },

  "corporate-actions": {
    title: "Corporate Actions",
    prev: { slug: "tax", title: "Tax Reporting" },
    next: { slug: "tools", title: "Research & Planning" },
    sections: [
      {
        heading: "Supported Actions",
        content: `<table>
<tr><th>Automated</th><th>Manual (Requires Decision)</th></tr>
<tr><td>Share splits &amp; consolidations</td><td>Mergers (MERGER_IN/OUT)</td></tr>
<tr><td>Bonus shares</td><td>Rights issues</td></tr>
<tr><td>Return of capital</td><td></td></tr>
</table>`,
      },
      {
        heading: "How to Record",
        content: `<ol>
<li>Navigate to a holding detail page</li>
<li>Access <strong>Corporate Actions</strong> page</li>
<li>Select action type: Stock Split, Bonus Issue, Return of Capital, or Rights Issue</li>
<li>Enter the date and relevant values (ratio, quantity, price)</li>
<li>Click &ldquo;Record Action&rdquo;</li>
</ol>`,
      },
    ],
  },

  "tools": {
    title: "Research & Planning Tools",
    prev: { slug: "corporate-actions", title: "Corporate Actions" },
    next: { slug: "analytics", title: "Advanced Analytics" },
    sections: [
      {
        heading: "Research Tools",
        content: `<ul>
<li><strong>Watchlist</strong> (<code>/tools/watchlist</code>) &mdash; Monitor investments with price alerts and notes</li>
<li><strong>Share Checker</strong> (<code>/tools/checker</code>) &mdash; Automated portfolio health checks</li>
<li><strong>Market Sentiment</strong> (<code>/tools/sentiment</code>) &mdash; Fear &amp; Greed Index, VIX, sector heatmap</li>
<li><strong>AI Assistant</strong> (<code>/tools/assistant</code>) &mdash; Chat-based portfolio Q&amp;A (requires Gemini API key)</li>
</ul>`,
      },
      {
        heading: "FIRE Calculator",
        content: `<p>Model your path to financial independence at <code>/tools/fire</code>:</p>
<ul>
<li>FIRE Number &amp; Years to FIRE</li>
<li>Coast FIRE calculation</li>
<li>Australian superannuation integration</li>
<li>Pessimistic / baseline / optimistic scenarios</li>
<li>Year-by-year projection chart</li>
</ul>`,
      },
    ],
  },

  "analytics": {
    title: "Advanced Analytics",
    prev: { slug: "tools", title: "Research & Planning" },
    next: { slug: "export", title: "Data Export & Backup" },
    sections: [
      {
        heading: "Risk Metrics",
        content: `<p>Comprehensive 5-tab dashboard at <code>/analytics/risk</code> with 19 metrics: Sharpe, Sortino, Calmar, Treynor, Omega, VaR, CVaR, capture ratios, R&sup2;, skewness, kurtosis, and more. Real benchmark comparison using ASX 200, S&amp;P 500, and MSCI World.</p>`,
      },
      {
        heading: "Backtesting",
        content: `<p>Walk-forward backtest at <code>/analytics/backtest</code> with 5 strategies: Equal Weight, Min Variance, Max Sharpe, Risk Parity, and Mean-Variance. Configurable rebalancing (monthly, quarterly, annually) with strategy comparison and model selection.</p>`,
      },
      {
        heading: "Portfolio Optimisation",
        content: `<p>At <code>/analytics/optimize</code>: Mean-Variance (3 objectives &times; 3 risk measures), Hierarchical Risk Parity (HRP) with dendrogram, and Risk Parity / risk budgeting. Weight constraints, current vs recommended comparison.</p>`,
      },
      {
        heading: "Efficient Frontier & Black-Litterman",
        content: `<p><code>/analytics/frontier</code> &mdash; Interactive scatter plot with 50-point curve, individual assets, Max Sharpe and Min Risk points.</p>
<p><code>/analytics/black-litterman</code> &mdash; Combine market equilibrium with absolute/relative views and confidence sliders.</p>`,
      },
      {
        heading: "Monte Carlo & Stress Testing",
        content: `<ul>
<li><strong>Monte Carlo</strong> (<code>/analytics/monte-carlo</code>) &mdash; Bootstrap, parametric, copula methods with fan charts and withdrawal modelling</li>
<li><strong>Stress Testing</strong> (<code>/analytics/stress-test</code>) &mdash; 6 historical crisis scenarios, factor stress, custom shocks</li>
</ul>`,
      },
      {
        heading: "Factor, Correlation & Tactical",
        content: `<ul>
<li><strong>Factor Analysis</strong> (<code>/analytics/factors</code>) &mdash; PCA + Fama-French regression</li>
<li><strong>Correlations</strong> (<code>/analytics/correlations</code>) &mdash; Heatmap, hierarchical clustering</li>
<li><strong>Tactical Allocation</strong> (<code>/analytics/tactical</code>) &mdash; 6 signal-based strategies</li>
</ul>`,
      },
    ],
  },

  "export": {
    title: "Data Export & Backup",
    prev: { slug: "analytics", title: "Advanced Analytics" },
    next: { slug: "api", title: "API Access" },
    sections: [
      {
        heading: "Export Options",
        content: `<table>
<tr><th>Format</th><th>Contents</th></tr>
<tr><td>CSV (Trades)</td><td>All transactions &mdash; re-importable</td></tr>
<tr><td>CSV (Holdings)</td><td>Current positions with cost base and market value</td></tr>
<tr><td>CSV (Dividends)</td><td>All dividend and distribution records</td></tr>
<tr><td>JSON (Full Backup)</td><td>Complete portfolio data including settings</td></tr>
</table>
<p>Access via <code>/settings/export</code>. PDF export and automated backups planned for R4.</p>`,
      },
    ],
  },

  "api": {
    title: "API Access",
    prev: { slug: "export", title: "Data Export & Backup" },
    sections: [
      {
        heading: "Capabilities",
        content: `<ul>
<li>List/create portfolios (<code>GET/POST /api/v1/portfolios</code>)</li>
<li>Get/update/delete portfolio (<code>GET/PATCH/DELETE /api/v1/portfolios/[id]</code>)</li>
<li>Search instruments (<code>GET /api/v1/market/search?q=...</code>)</li>
<li>Bearer token authentication with scope checking (read/write/admin)</li>
<li>Rate limited to 100 requests/minute per token</li>
</ul>`,
      },
      {
        heading: "Authentication",
        content: `<p>Bearer token with configurable scopes and optional expiry. Manage tokens at <code>/settings/api-tokens</code>.</p>
<pre><code>curl http://localhost:3000/api/v1/portfolios \\
  -H "Authorization: Bearer your-api-token-here"</code></pre>`,
      },
    ],
  },
};
