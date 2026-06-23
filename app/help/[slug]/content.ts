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
        heading: "Navigation Overview",
        content: `<p>After signing in, you land on the <strong>Dashboard</strong> showing your total portfolio value, gain/loss, and recent activity. The sidebar provides access to all sections:</p>
<table>
<tr><th>Sidebar Link</th><th>What It Contains</th></tr>
<tr><td><strong>Dashboard</strong></td><td>Summary cards, portfolio performance chart, allocation treemap, portfolio table, recent activity</td></tr>
<tr><td><strong>Portfolio</strong></td><td>Create/manage portfolios, holdings, imports, bonds, cash</td></tr>
<tr><td><strong>Reports</strong></td><td>10 performance and allocation reports</td></tr>
<tr><td><strong>Tax</strong></td><td>Taxable income, CGT, and unrealised CGT reports</td></tr>
<tr><td><strong>Tools</strong></td><td>Watchlist, FIRE calculator, Share Checker, Market Sentiment, AI Assistant</td></tr>
<tr><td><strong>Analytics</strong></td><td>13 quantitative analysis tools</td></tr>
<tr><td><strong>Settings</strong></td><td>Groups, labels, sharing, export, API tokens</td></tr>
</table>`,
      },
      {
        heading: "What You'll Do First",
        content: `<ol>
<li><strong>Create your account</strong> &mdash; Register at <code>/register</code> with name, email, and password (minimum 8 characters). Or sign in with Google OAuth.</li>
<li><strong>Create a portfolio</strong> &mdash; From the sidebar click <strong>Portfolio</strong>, then &ldquo;New Portfolio&rdquo;, choose tax residency and entity type</li>
<li><strong>Import your investments</strong> &mdash; Click into your portfolio, then use the &ldquo;Import&rdquo; or &ldquo;&starf; AI Import&rdquo; button</li>
<li><strong>Explore reports</strong> &mdash; Click <strong>Reports</strong> or <strong>Tax</strong> in the sidebar</li>
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
<li><strong>Consolidated View</strong> &mdash; See all portfolios combined (click &ldquo;Consolidated View&rdquo; button on the Portfolio page)</li>
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
<tr><th>Method</th><th>Best For</th><th>How to Access</th></tr>
<tr><td><strong>Quick Import</strong></td><td>Known brokers &mdash; one-step, no manual mapping</td><td>Portfolio &rarr; select portfolio &rarr; &ldquo;Import&rdquo; &rarr; Quick Import</td></tr>
<tr><td><strong>Guided Import</strong></td><td>Shares, bonds, or cash/bank statements via category wizard</td><td>Portfolio &rarr; select portfolio &rarr; &ldquo;Import&rdquo; &rarr; Guided Import</td></tr>
<tr><td><strong>Custom Import</strong></td><td>Complex multi-sheet files (e.g. FIIG data extract)</td><td>Portfolio &rarr; select portfolio &rarr; &ldquo;Import&rdquo; &rarr; Custom Import</td></tr>
<tr><td><strong>AI Importer</strong></td><td>PDFs, screenshots, non-standard formats (Gemini AI)</td><td>Portfolio &rarr; select portfolio &rarr; &ldquo;Import&rdquo; &rarr; &ldquo;&starf; AI Import&rdquo;</td></tr>
<tr><td><strong>Manual Entry</strong></td><td>One-off trades, corrections</td><td>Portfolio &rarr; holding &rarr; &ldquo;Add Transaction&rdquo;</td></tr>
</table>
<p>Every import path resolves duplicates automatically, so re-importing the same file is safe.</p>`,
      },
      {
        heading: "How to Import",
        content: `<ol>
<li>From the sidebar, click <strong>Portfolio</strong> &rarr; select your portfolio</li>
<li>Click <strong>&ldquo;Import&rdquo;</strong> in the portfolio header</li>
<li>Choose a path on the hub: <strong>Quick Import</strong> (one click), <strong>Guided Import</strong> (choose Share Transactions, Bonds &amp; Fixed Interest, or Cash / Bank Statement), or <strong>Custom Import</strong></li>
<li><strong>Upload</strong> &mdash; drag and drop your file (.csv, .txt, or .xlsx)</li>
<li><strong>Configure &amp; Map</strong> &mdash; pick a template or map columns to InvestaLens fields</li>
<li><strong>Review</strong> &mdash; see parsed rows colour-coded (green=valid, red=error)</li>
<li><strong>Import</strong> &mdash; confirm to insert</li>
</ol>`,
      },
      {
        heading: "How to Import (AI)",
        content: `<ol>
<li>From the import page, click the <strong>&ldquo;&starf; AI Import&rdquo;</strong> button</li>
<li>Select document type (Contract Note, Trade Confirmation, Dividend Statement, etc.)</li>
<li>Paste your document text</li>
<li>Click <strong>&ldquo;Parse with AI&rdquo;</strong> &mdash; Gemini extracts transactions automatically</li>
<li>Review the parsed transactions table</li>
<li>Click <strong>&ldquo;Import&rdquo;</strong> to confirm</li>
</ol>
<p><em>Requires <code>GOOGLE_GENERATIVE_AI_API_KEY</code> to be configured.</em></p>`,
      },
      {
        heading: "Supported Templates & Importers",
        content: `<p>Pre-built broker templates: CommSec, SelfWealth, Stake, CMC Markets, CMC Invest, Bell Direct, nabtrade, FIIG Securities, Interactive Brokers. Generic bank-statement templates handle cash imports. The FIIG Data Extract custom importer reads the full multi-sheet bond workbook (trades, coupon income, principal repayments, and custody fees). Custom templates can be created for any broker and saved for reuse.</p>`,
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
<li>Coupon income, principal repayments, and custody fee tracking with summary totals</li>
<li>One-step FIIG Securities import (trades, income, and fees)</li>
<li>Update current bond prices from the FIIG rate sheet (Settings &rarr; Market Data &rarr; &ldquo;Update&rdquo;), matched by ISIN</li>
<li>Returns include income and net custody fees; accrued interest is tracked and netted into income</li>
<li>Income forecasting and accrued interest tracking</li>
</ul>`,
      },
      {
        heading: "Stock Information",
        content: `<p>Each share and ETF holding shows rich company information from Yahoo Finance, refreshed alongside prices (<strong>Settings &rarr; Market Data &rarr; &ldquo;Update&rdquo;</strong>, which streams share, bond, and company-info updates in one step). Open a holding to see a tabbed <strong>Company Information</strong> panel:</p>
<ul>
<li><strong>Overview</strong> &mdash; business summary, sector/industry/country, and key fundamentals (market cap, P/E, EPS, beta, dividend yield, margins, ROE, 52-week range)</li>
<li><strong>Analysts</strong> &mdash; price targets with upside vs current price, recommendation-trend chart, and recent upgrades/downgrades</li>
<li><strong>Financials</strong> &mdash; five-year revenue, gross profit, EBITDA and net income</li>
<li><strong>News</strong> &mdash; recent headlines with publisher, date and links</li>
<li><strong>Events</strong> &mdash; next earnings date, ex-dividend/dividend dates, EPS estimates</li>
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
        heading: "Portfolio Overview",
        content: `<p>The Portfolio page shows each portfolio as a summary card with an allocation donut (current value by holding), current value, 1M / 6M / 1Y / 3Y returns, and the three most recent transactions. When you have more than one portfolio, a highlighted <strong>Consolidated View</strong> card leads the grid.</p>`,
      },
      {
        heading: "Organisation Tools",
        content: `<table>
<tr><th>Feature</th><th>Purpose</th><th>How to Access</th></tr>
<tr><td><strong>Custom Groups</strong></td><td>Group holdings by your own categories</td><td>Sidebar &rarr; Settings &rarr; Custom Groups</td></tr>
<tr><td><strong>Labels</strong></td><td>Tag holdings for filtered reporting</td><td>Sidebar &rarr; Settings &rarr; Labels</td></tr>
<tr><td><strong>Consolidated View</strong></td><td>Aggregate view across all portfolios</td><td>Sidebar &rarr; Portfolio &rarr; highlighted &ldquo;Consolidated View&rdquo; card</td></tr>
<tr><td><strong>Bonds</strong></td><td>Bond analytics, maturity ladder, YTM</td><td>Portfolio &rarr; select portfolio &rarr; &ldquo;Bonds&rdquo; button</td></tr>
<tr><td><strong>Cash Accounts</strong></td><td>Cash alongside investments</td><td>Portfolio &rarr; select portfolio &rarr; &ldquo;Cash&rdquo; button</td></tr>
</table>`,
      },
      {
        heading: "Sharing & Collaboration",
        content: `<p>Share portfolio access with advisers, accountants, or family (Sidebar &rarr; Settings &rarr; Sharing):</p>
<ul><li><strong>Read Only</strong> &mdash; View all data</li><li><strong>Read and Write</strong> &mdash; Add/modify holdings</li><li><strong>Admin</strong> &mdash; Full access except account-level changes</li></ul>`,
      },
      {
        heading: "Key Settings",
        content: `<table>
<tr><th>Setting</th><th>Impact</th></tr>
<tr><td>Tax Residency</td><td>Determines currency, tax rules, reports</td></tr>
<tr><td>Tax Entity Type</td><td>CGT discount rate (Individual 50%, SMSF 33&frac13;%, Company 0%)</td></tr>
<tr><td>Sale Allocation Method</td><td>FIFO, LIFO, Minimise CGT, etc.</td></tr>
<tr><td>CGT Regime</td><td>Current (50% discount) or proposed 2027 (indexation + 30% min-tax) &mdash; Settings &rarr; Tax &amp; CGT</td></tr>
<tr><td>Instrument Tax Class</td><td>CGT vs income treatment per instrument &mdash; Settings &rarr; Instrument Tax</td></tr>
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
        heading: "How to Access",
        content: `<p>Click <strong>Reports</strong> in the sidebar to see all 10 available reports. Each report card links to a dedicated page.</p>`,
      },
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
<li><strong>Drawdown Risk</strong> &mdash; Maximum drawdown and RoMaD per holding</li>
<li><strong>Historical Cost</strong> &mdash; Opening/closing cost base for accounting</li>
<li><strong>All Trades</strong> &mdash; Complete transaction history across portfolios</li>
</ul>
<p>For ETF look-through exposure analysis, see <strong>Analytics &rarr; ETF X-ray &amp; Exposure</strong>.</p>`,
      },
      {
        heading: "Risk Analysis (Share Checker)",
        content: `<p>Automated health check scanning for concentration risk, stale prices, missing cost base, and duplicate holdings. Access via <strong>Sidebar &rarr; Tools &rarr; Share Checker</strong>.</p>`,
      },
    ],
  },

  "tax": {
    title: "Tax Reporting",
    prev: { slug: "reports", title: "Performance & Reporting" },
    next: { slug: "corporate-actions", title: "Corporate Actions" },
    sections: [
      {
        heading: "How to Access",
        content: `<p>Click <strong>Tax</strong> in the sidebar to see the tax hub with links to all tax reports.</p>`,
      },
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
<li>CPI indexation method for assets acquired before 21 September 1999 (uses whichever gives the lower gain)</li>
<li>Traditional bonds treated as income (CGT-exempt); listed bonds &amp; hybrids subject to CGT</li>
<li>Proposed 2027 regime projection (opt-in) &mdash; cost-base indexation, 30% minimum tax, transitional split</li>
<li>CGT parcel matcher &mdash; Compare all 5 methods to find optimal allocation</li>
</ul>`,
      },
      {
        heading: "CGT Methods &amp; the 2027 Projection",
        content: `<p>Australian CGT offers two methods for assets held over 12 months: the <strong>discount method</strong> (50% / 33&frac13;% / 0% by entity) and, for assets acquired before 21 September 1999, the <strong>indexation method</strong> (cost base indexed by CPI, frozen at the September 1999 quarter). InvestaLens uses whichever gives the lower assessable gain and shows the method per disposal.</p>
<p><strong>Bonds:</strong> traditional bonds are exempt from CGT &mdash; their discount or premium is ordinary income (shown as <em>Bond Capital Growth</em> in the Taxable Income report). Listed bonds and hybrids remain subject to CGT. Override the treatment under Settings &rarr; Instrument Tax.</p>
<p><strong>Proposed 2027 regime (not yet law):</strong> toggle <em>Show proposed 2027 regime projection</em> on the CGT report and choose your income band to model cost-base indexation, the 30% minimum tax, and the 1 July 2027 transitional split. Configure entity type, residency and income-support status under Settings &rarr; Tax &amp; CGT.</p>`,
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
<li>From the sidebar, click <strong>Portfolio</strong> &rarr; select your portfolio</li>
<li>Click a holding code to open the holding detail page</li>
<li>Click the <strong>&ldquo;Corporate Actions&rdquo;</strong> button in the top-right</li>
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
        heading: "How to Access",
        content: `<p>Click <strong>Tools</strong> in the sidebar to see all available tools on one page.</p>`,
      },
      {
        heading: "Research Tools",
        content: `<table>
<tr><th>Tool</th><th>Purpose</th></tr>
<tr><td><strong>Watchlist</strong></td><td>Monitor investments with price alerts and notes</td></tr>
<tr><td><strong>Share Checker</strong></td><td>Automated portfolio health checks (concentration, stale data, duplicates)</td></tr>
<tr><td><strong>Market Sentiment</strong></td><td>Fear &amp; Greed Index, VIX, sector heatmap</td></tr>
<tr><td><strong>AI Assistant</strong></td><td>Chat-based portfolio Q&amp;A (requires Gemini API key)</td></tr>
</table>`,
      },
      {
        heading: "FIRE Calculator",
        content: `<p>Model your path to financial independence:</p>
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
        heading: "How to Access",
        content: `<p>Click <strong>Analytics</strong> in the sidebar to see all 13 analytics tools on one page. Each card links to a dedicated analysis tool.</p>`,
      },
      {
        heading: "Risk Metrics",
        content: `<p>Comprehensive 5-tab dashboard with 19 metrics: Sharpe, Sortino, Calmar, Treynor, Omega, VaR, CVaR, capture ratios, R&sup2;, skewness, kurtosis, and more. Real benchmark comparison using ASX 200, S&amp;P 500, and MSCI World.</p>`,
      },
      {
        heading: "Backtesting",
        content: `<p>Walk-forward backtest with 5 strategies: Equal Weight, Min Variance, Max Sharpe, Risk Parity, and Mean-Variance. Configurable rebalancing (monthly, quarterly, annually). Also includes strategy comparison and cross-validation/model selection pages.</p>`,
      },
      {
        heading: "Portfolio Optimisation",
        content: `<p>Mean-Variance (3 objectives &times; 3 risk measures), Hierarchical Risk Parity (HRP) with dendrogram, and Risk Parity / risk budgeting. Weight constraints, current vs recommended comparison.</p>`,
      },
      {
        heading: "Efficient Frontier & Black-Litterman",
        content: `<p><strong>Efficient Frontier</strong> &mdash; Interactive scatter plot with 50-point curve, individual assets, Max Sharpe and Min Risk points.</p>
<p><strong>Black-Litterman</strong> &mdash; Combine market equilibrium with absolute/relative views and confidence sliders.</p>`,
      },
      {
        heading: "Monte Carlo & Stress Testing",
        content: `<ul>
<li><strong>Monte Carlo Simulation</strong> &mdash; Bootstrap, parametric, copula methods with fan charts and withdrawal modelling</li>
<li><strong>Stress Testing</strong> &mdash; 6 historical crisis scenarios, factor stress, custom shocks (via the What-If page)</li>
</ul>`,
      },
      {
        heading: "Factor, Correlation & Tactical",
        content: `<ul>
<li><strong>Factor Analysis</strong> &mdash; PCA + Fama-French regression</li>
<li><strong>Correlation Analysis</strong> &mdash; Heatmap, hierarchical clustering, period selector</li>
<li><strong>Tactical Allocation</strong> &mdash; 6 signal-based strategies (Momentum, Mean Reversion, Vol Targeting, etc.)</li>
<li><strong>ETF X-ray &amp; Exposure</strong> &mdash; Look-through decomposition and sector/geography treemap</li>
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
        heading: "How to Access",
        content: `<p>Navigate to <strong>Sidebar &rarr; Settings &rarr; Export</strong> to download your data.</p>`,
      },
      {
        heading: "Export Options",
        content: `<table>
<tr><th>Format</th><th>Contents</th></tr>
<tr><td>CSV (Trades)</td><td>All transactions &mdash; re-importable</td></tr>
<tr><td>CSV (Holdings)</td><td>Current positions with cost base and market value</td></tr>
<tr><td>CSV (Dividends)</td><td>All dividend and distribution records</td></tr>
<tr><td>JSON (Full Backup)</td><td>Complete portfolio data including settings</td></tr>
</table>
<p>PDF export and automated backups planned for R4.</p>`,
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
<li>Holdings CRUD (<code>/api/v1/portfolios/[id]/holdings</code>)</li>
<li>Transactions CRUD (<code>/api/v1/portfolios/[id]/transactions</code>)</li>
<li>Performance metrics (<code>GET /api/v1/portfolios/[id]/performance</code>)</li>
<li>Diversity breakdown (<code>GET /api/v1/portfolios/[id]/diversity</code>)</li>
<li>Import/Export (<code>POST .../import</code>, <code>GET .../export</code>)</li>
<li>Search instruments (<code>GET /api/v1/market/search?q=...</code>)</li>
<li>Market quote (<code>GET /api/v1/market/quote/[code]</code>)</li>
<li>AI import (<code>POST /api/v1/ai-import</code>)</li>
<li>Bearer token authentication with scope checking (read/write/admin)</li>
<li>Rate limited to 100 requests/minute per token</li>
</ul>`,
      },
      {
        heading: "Authentication",
        content: `<p>Bearer token with configurable scopes and optional expiry. Manage tokens at <strong>Sidebar &rarr; Settings &rarr; API Tokens</strong>.</p>
<pre><code>curl http://localhost:3000/api/v1/portfolios \\
  -H "Authorization: Bearer your-api-token-here"</code></pre>`,
      },
    ],
  },
};
