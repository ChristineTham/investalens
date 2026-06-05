# InvestaLens Account & Portfolio Management

> **📖 Part of the [InvestaLens User Manual](../USER-MANUAL.md)** | Previous: [Assets](ASSETS.md) | Next: [Tools & Reports](TOOLS.md)

## Overview

This document covers account setup, portfolio management, sharing, organisation features, and tax settings in InvestaLens.

**Jump to:**

- [Manage Portfolios](#manage-portfolios)
- [Add a Portfolio](#add-a-portfolio)
- [Portfolio Settings](#portfolio-settings)
- [Tax Residency](#tax-residency)
- [Tax Settings](#tax-settings)
- [Sale Allocation Method (CGT)](#sale-allocation-method-cgt)
- [Share Your Portfolio](#share-your-portfolio)
- [Custom Groups](#custom-groups)
- [Labels](#labels)
- [Consolidated View](#consolidated-view)
- [Share Transfers Between Portfolios](#share-transfers-between-portfolios)
- [Recreating a Portfolio in a Different Tax Residency](#recreating-a-portfolio-in-a-different-tax-residency)
- [AI Importer](#ai-importer)
- [Emergency Fund](#emergency-fund)

---

## Manage Portfolios

InvestaLens portfolio settings are applied to the portfolio you are currently viewing. Settings are selected when you create a new portfolio and most can be edited within the Settings tab.

### Portfolio Settings

Access portfolio settings via **Settings > Details**:

| Setting | Description | Editable |
|---------|-------------|----------|
| Portfolio Name | Display name used within InvestaLens | Yes |
| Tax Residency | Country determining currency, tax rules, and reporting | **No** (permanent) |
| Financial Year End | Month marking end of financial year | Yes |
| Performance Calculation Method | Simple or Compound percentage return calculation | Yes |
| Tax Entity Type | Determines CGT discount applied (AU only) | Yes |

---

## Add a Portfolio

Add additional portfolios to your InvestaLens account to track multiple broker accounts and tax entities.

> **Recommendation:** Create a separate portfolio for each tax entity that you wish to manage.

### Steps to Create a New Portfolio

1. Click on the portfolio dropdown menu at the top right of any page
2. Click **Create new portfolio**
3. Enter a **Portfolio Name** (display name, can be edited later)
4. Select the **Tax Residency** country

> **Important:** The tax residency cannot be changed once the portfolio is created. It determines the portfolio currency, tax settings, and reports.

5. Select the **Financial Year End** month (e.g. June for a 1 July – 30 June year)
6. Select the **Performance Calculation Method** (Simple or Compound)
7. Select the **Tax Entity Type** (Australia only):
   - **Individuals / Trust** — CGT discount of 50%
   - **Self-Managed Super Fund** — CGT discount of 33⅓%
   - **Company** — CGT discount nil
8. Click **Create Portfolio**

After creation, you can add investments by:
- Importing from a CSV file
- Connecting via an API integration (e.g. Sharesight)
- Manually adding holdings

---

## Tax Residency

The tax residency is the country selected when setting up your portfolio. It determines:

### Portfolio Currency

All holdings are displayed in the portfolio currency. Foreign exchange holdings and investments traded in a different currency are automatically converted, showing the exchange rate applied.

**Example:** A UK tax residency portfolio holding Apple shares on NASDAQ will display values in GBP with the USD→GBP exchange rate applied.

### Tax Functionality

- Reports for tax purposes specific to the country
- Country-specific data input requirements in transaction and income windows
- Capital gains calculations following local tax rules

> **Note:** Tax residency cannot be changed after portfolio creation. All data is converted to the currency and calculated according to the tax requirements of the selected country. To change residency, you must recreate the portfolio (see below).

---

## Tax Settings

### Changing Tax Entity Type (Australia)

To change the tax entity type for an Australian portfolio:

1. Click the **Settings** tab
2. Click the **Tax Settings** side tab
3. Select your Tax Entity Type:
   - **Individuals / Trust** — CGT discount of 50%
   - **Self-Managed Super Fund** — CGT discount of 33.3%
   - **Company** — CGT discount nil
4. Click **Save**

---

## Sale Allocation Method (CGT)

The sale allocation method determines which buy parcels InvestaLens assigns to a sell trade when calculating capital gains. InvestaLens tracks every parcel you hold — including partially sold parcels — so each unit can only be allocated to one sale, with no risk of double-counting across financial years.

> For full CGT report details including breakdown tabs, locking, and tax planning strategies, see [TAX.md](TAX.md#capital-gains-tax-cgt-report).

### How Parcel Tracking Works

When you record a sell trade, the system matches that sale against your available buy parcels using the selected method. Each parcel has one of three states:

| State | Description |
|-------|-------------|
| Available | Not yet sold; eligible for matching against future sell trades |
| Partially Disposed | Some units sold; remaining units tracked separately |
| Fully Disposed | All units sold; no longer available for allocation |

### Available Methods

| Method | Description |
|--------|-------------|
| **First In, First Out (FIFO)** | Shares purchased first are sold first (default, aligns with ATO default) |
| **Last In, First Out (LIFO)** | Shares purchased most recently are sold first |
| **Minimise Capital Gain** | Shares with highest purchase price sold first (minimises gain / maximises loss) |
| **Maximise Capital Gain** | Shares with lowest purchase price sold first |
| **Minimise Capital Gain Tax** | Considers both purchase price and holding period to minimise overall tax liability; prioritises parcels eligible for CGT discount where beneficial |

### Changing Methods Across Financial Years

You can use a different sale allocation method each time you run the CGT Report. However, changing the method for a prior financial year can alter parcel allocation across all subsequent years.

**Lock-in feature:** Lock the sale allocation method for a completed financial year to preserve that year's allocation. Once locked, it won't be overridden if you change the method for a different period.

> **Important:** If you have changed sale allocation methods between financial years without using lock-in, the parcel matching across those years may be incorrect. Review your CGT Report and use lock-in to fix each year in sequence from oldest to most recent.

### How to Change the Method

1. Run the CGT Report for the relevant financial year
2. Click **Optimise** on the Sale Allocation Method card to automatically select the most tax-effective method
3. To lock the method, click **Lock for period** at the bottom of the report

> **Note:** InvestaLens does not provide taxation advice. Consult your accountant or tax adviser if unsure which method applies.

---

## Share Your Portfolio

Share your InvestaLens portfolio with other people, such as:

- **Friends & family** — enable anyone to track the performance of your portfolio
- **Share club members** — enable the whole club to track performance and make investment decisions
- **Accountant or financial advisor** — enable them to view your portfolio for professional guidance

### Access Levels

| Level | Capabilities |
|-------|-------------|
| **Read Only** | View all data in your portfolio; cannot change or modify anything |
| **Read and Write** | View all data plus add, modify, and delete holdings, trades, and dividends. Cannot add portfolios, alter settings, or invite users |
| **Admin** | View and modify all data, edit portfolio settings and integrations. Cannot delete/rename the portfolio or invite additional users |

### How to Share Access

1. Click the **Settings** tab
2. Click the **Portfolio Sharing** tab
3. Enter the person's first name, last name, and email address
4. Select the **Access Level** (Read Only, Read and Write, or Admin)
5. Click **Share Portfolio** — an email invitation will be sent

### Managing Shared Access

Once you have invited someone, you can change their access level or remove their access at any time:

1. Go to **Settings > Portfolio Sharing**
2. View the list of shared users
3. **Change access level**: Click on the current access level and select a new one from the dropdown
4. **Remove access**: Click the delete icon next to the user

---

## Custom Groups

Custom Groups enable you to customise how your holdings are grouped on reports, which is useful for applying your own asset allocation framework.

### Where Custom Groups Can Be Used

- Portfolio Investments Page
- Performance Report
- Diversity Report
- Historical Cost Report
- Sold Securities Report
- Contribution Analysis Report
- Exposure Report
- Multi-Period Report
- All Trades Report

### How Custom Groups Work

- A **Custom Group** is a collection of **Categories**
- Categories are not shared between Custom Groups
- Custom Groups are saved at the **account level** — applied to all portfolios in your account
- The "Ungrouped Instruments" list contains holdings from all portfolios in your account

### Creating a Custom Group

1. Click **Account** from the top right of the screen
2. Select **Custom Groups** from the dropdown menu
3. Name your Custom Group (click the default name to edit)
4. Click **Add new category** to create categories within the group
5. Name each category
6. Drag and drop holdings from the "Ungrouped Instruments" list into the appropriate category

### Using Custom Groups

To apply a Custom Group, use the **Group By** option on Reports or the Portfolio Investments Page. Your Custom Groups will be listed below the default groupings (Market, Sector, Industry, Investment Type, Country).

### Default Grouping Options (Always Available)

- Market
- Currency
- Sector Classification
- Industry Classification
- Investment Type
- Country
- No grouping (individual holdings)

---

## Labels

Labels allow you to report on specific subsets of holdings within a portfolio, creating custom filtered reports (especially the Performance Report).

### How Labels Work

- Labels can be anything you like (e.g. "Growth", "Income", "Broker A", "Advisor Recommended")
- Holdings can have more than one label assigned
- Labels are used as filters in reports — only show holdings matching selected labels
- Labels can only be created and applied from an individual portfolio (not consolidated views)

### Creating and Applying Labels

Labels can be created and applied from:

1. **Settings tab** — Go to Settings > Labels, name the label, select holdings, click Create
2. **Performance Report** — Click "Filter by Label" > Manage, create and assign labels
3. **Individual Holding Page** — Click Summary tab > Manage Labels, create and assign

### Managing Labels

- **Attach existing label to a holding**: In the Labels settings, select the holding and click Attach next to the desired label
- **Delete a label**: Click the delete icon next to the label
- **Remove a label from a holding**: Click the delete icon within the holding's label assignment

---

## Consolidated View

The Consolidated View allows you to see your total portfolio value and performance across all portfolios in one place. It is useful when you have multiple portfolios representing different tax entities or broker accounts but want a holistic view of your investments.

**Key features:**

- Combined portfolio value across all or selected portfolios
- Run reports across multiple portfolios
- Does not support label creation/application (use individual portfolios for that)

---

## Share Transfers Between Portfolios

Share transfers — moving ownership of stocks, ETFs, or other securities from one portfolio to another — need to be recorded manually. For broader corporate action guidance (mergers, demergers, etc.), see [ACTIONS.md](ACTIONS.md).

### Recording a Transfer

1. Open the portfolio where the stock is currently recorded
2. Note the **cost base per share** from the holding's Summary tab
3. Go to **Trades & Income** tab and select **Add trade or adjustment**
4. Record a **Sell trade**:
   - Trade date = date of transfer
   - Quantity = number of shares transferred
   - Unit price = cost base per share (from step 2)
5. Open the destination portfolio
6. Click **Add Investment**
7. Record the transferred shares as either:
   - **Opening Balance**: date = transfer date, cost base = transferred units × cost base per share, quantity = transferred units
   - **Buy trade**: trade date = transfer date, quantity = transferred units, unit price = cost base per share

### Moving Holdings with Full History

If you need to transfer a holding with its entire trading history (all buys, sells, and dividends), contact support with:

- The name of the original portfolio
- The ticker code of the holding
- The name of the destination portfolio

---

## Recreating a Portfolio in a Different Tax Residency

Since tax residency cannot be changed after creation, you must recreate the portfolio if you need different currency or tax settings.

### Steps

1. Run the **All Trades Report** in the original portfolio (set date to "Since Inception")
2. Export the report to CSV/spreadsheet
3. Create a new portfolio with the desired tax residency
4. Use File Import to import the exported All Trades Report into the new portfolio

> **Note:** Do not map the exchange rate column when importing into the new portfolio — InvestaLens will apply the correct rates for the new currency.

> **Note:** The All Trades Report will not import dividends or corporate actions that you may have previously adjusted. You may need to re-enter those manually.

> **Note:** If you have custom investments, you must manually create those holdings in the new portfolio (with the same instrument codes) before importing.

---

## AI Importer

The AI Importer is an AI-powered file importer that can read trade data from almost any file type and import trades directly into your portfolio.

### What Problem Does It Solve?

The standard file importer requires files to be in an exact format. A small change to a broker's export layout can cause import failures. The AI Importer removes this barrier by reading and interpreting data intelligently, as long as the key trade details are present.

### Supported File Types

- Broker spreadsheets (any format, including unsupported layouts)
- PDF trade confirmations
- Screenshots of trade history
- Images of statements or contract notes

### Who Is It Most Useful For?

- **Unsupported brokers** — brokers whose spreadsheet format the standard importer cannot process
- **PDF trade confirmations** — upload directly instead of manual entry
- **Opening balances** — quickly import a snapshot from any statement or document
- **Users who prefer simplicity** — upload and let the AI do the formatting work

> **Note:** For brokers with API integration or automatic sync already set up, the AI Importer is not required — trades are already syncing automatically.

### How to Use

1. From your portfolio, click **Add Investment**
2. Select **Upload via a file**
3. Select **Upload any file format** (AI Importer)
4. Upload your file (spreadsheet, PDF, image, or screenshot)
5. The AI Importer reads the file and maps trade data
6. Review the trades before confirming the import

### Enabling the AI Importer

To use the AI Importer, enable these settings under **Account > Account Preferences**:

- Enable beta features
- Enable AI features

Both must be turned on. You can disable the AI Importer at any time by turning off either setting.

---

## Emergency Fund

The Emergency Fund feature lets you define and track a savings target for unexpected expenses, separate from your investment portfolio.

### Why Track an Emergency Fund?

Financial planning best practice recommends maintaining 3–6 months of living expenses in liquid, easily accessible savings before investing. InvestaLens helps you visualise this alongside your investments so you can see your complete financial picture.

### Setting Up Your Emergency Fund

1. Navigate to **Account > Emergency Fund**
2. Set your **target amount** (e.g. 6 months × monthly expenses)
3. Set your **current balance** (amount currently saved)
4. Optionally link a Cash Account that represents your emergency savings

### Emergency Fund Dashboard

| Element | Description |
|---------|-------------|
| Target | Your defined emergency fund goal |
| Current Balance | Amount currently held |
| Progress Bar | Visual indicator showing % of target reached |
| Months Covered | Current balance ÷ monthly expenses = months of runway |
| Status | 🟢 Fully funded, 🟡 Partially funded, 🔴 Below minimum |

### Configuration Options

| Setting | Description | Default |
|---------|-------------|--------|
| Monthly Expenses | Your average monthly living costs | Manual entry |
| Target Months | Number of months you want covered | 6 |
| Linked Cash Account | Cash Account representing emergency savings | None |
| Include in Net Worth | Whether emergency fund appears in net worth calculation | Yes |

### How It Interacts with Investing

The Emergency Fund is shown on the main dashboard alongside your portfolio value, helping you answer: "Am I financially secure enough to invest more, or should I top up my emergency fund first?"

> **Note:** The emergency fund is a planning tool only. InvestaLens does not restrict or automate transfers between your emergency fund and investment accounts.

---

## Related Documentation

| Document | Description |
|----------|-------------|
| [GETTING-STARTED.md](GETTING-STARTED.md) | Portfolio setup, CSV import guide, and adding investments |
| [DATA_IMPORT.md](DATA_IMPORT.md) | Full import architecture and field mapping |
| [TOOLS.md](TOOLS.md) | All performance, allocation, and tax reports |
| [TAX.md](TAX.md) | Australian tax reporting, CGT calculations, and AMIT |
| [ASSETS.md](ASSETS.md) | Supported asset types, custom investments, and exchanges |
| [ACTIONS.md](ACTIONS.md) | Corporate actions (splits, mergers, and demergers) |
