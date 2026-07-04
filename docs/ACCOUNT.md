# InvestaLens Account & Portfolio Management

> **📖 Part of the [InvestaLens User Manual](../USER-MANUAL.md)** | Previous: [Assets](ASSETS.md) | Next: [Tools & Reports](TOOLS.md)

> **Implementation Status (R1 MVP)**
>
> | Feature                              | Status                              |
> | ------------------------------------ | ----------------------------------- |
> | Create/rename/delete portfolios      | ✅ Implemented                      |
> | Broker / account details (editable)  | ✅ Implemented                      |
> | Merge one portfolio into another     | ✅ Implemented                      |
> | Portfolio detail charts & timescale  | ✅ Implemented                      |
> | Tax residency & entity type settings | ✅ Implemented                      |
> | Sale allocation method (5 methods)   | ✅ Implemented                      |
> | CGT indexation method (pre-1999)     | ✅ Implemented                      |
> | Proposed 2027 CGT regime projection  | ✅ Implemented                      |
> | Instrument tax-class override        | ✅ Implemented                      |
> | Portfolio sharing (read-only viewing) | ✅ Implemented (server action + UI) |
> | Sharing write/admin enforcement      | ⏳ To be Implemented (levels selectable, currently read-only) |
> | Custom groups with categories        | ✅ Implemented (server action + UI) |
> | Labels (create, assign to holdings)  | ✅ Implemented (server action + UI) |
> | Consolidated view                    | ✅ Implemented (page)               |
> | Share transfers between portfolios   | ✅ Supported via TRANSFER_IN/OUT    |
> | AI Importer                          | ✅ Implemented (R2)                 |
> | Emergency Fund tracker               | ⏳ To be Implemented (R4)           |

## Overview

This document covers account setup, portfolio management, sharing, organisation features, and tax settings in InvestaLens.

**Jump to:**

- [Manage Portfolios](#manage-portfolios)
- [Add a Portfolio](#add-a-portfolio)
- [Portfolio Detail Page](#portfolio-detail-page)
- [Merge Portfolios](#merge-portfolios)
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

### Portfolio Overview Cards

The **Portfolio** page presents each portfolio as an equal-height summary card showing an allocation donut (current value by holding) with a top-holdings legend, the current value, **1M / 6M / 1Y / 3Y returns** (contribution-adjusted capital return), and the three most recent transactions. Click a card to open the full **portfolio detail page**. With more than one portfolio, a highlighted **Consolidated View** card leads the grid, aggregating total value, portfolio/holding counts, and allocation by portfolio.

### Portfolio Detail Page

Opening a portfolio shows its **name in the breadcrumb** (with the portfolio's chosen **icon and colour**), a row of KPI cards (current value, capital gain, income, total gain), and **trailing returns** for 1M / 6M / 1Y / 3Y / 5Y / 10Y / All — periods of a year or more are shown **annualised (p.a.)**. If broker or account details have been entered, they appear under the header (the broker name links to the broker website).

Below that is a **responsive grid of charts** — every one **zoomable** via its maximise button — driven by a single **universal timescale selector** that is shared with the dashboard and analytics pages (and remembered between visits): 1M, 6M, **YTD**, **current financial year (FYTD)**, **previous financial year (Prev FY)**, 1Y, 3Y, 5Y, 10Y, and All. Changing the timescale updates every chart at once:

- **Value over time** — each holding stacked as an area, with the overall portfolio value as a bold line on top
- **Performance (gain / loss)** — total-gain %, optionally compared with a benchmark (ASX 200, S&P 500, MSCI World, etc.); the tooltip breaks the gain down as capital gain + income = total gain
- **Allocation by holding** — a **two-level (nested) pie**: the inner ring is sector and the outer ring is each holding's share of current value, with a rich hover tooltip (name, type, sector, purchase amount, current value, capital gain, income)
- **Movement** — net monthly cash flow (buys / sells / distributions) stacked by holding
- **Top & bottom performers** — the best and worst three holdings by total return, with the same hover detail

Any chart can be expanded to a larger **modal** using its maximise button. The **holdings table** adds sector, current price, purchase amount, current value, capital gain, income, total gain, annualised return, and a mini price **sparkline** (following the selected timescale). Each holding keeps a **consistent colour**, shown as a swatch in the table and used across every chart.

Below the holdings is a **Transactions** list spanning every holding in the portfolio, with an **Amount** column showing each transaction's signed cash effect. Each row is **editable inline** — change the date, type, quantity, price or brokerage, and use the coins icon on income rows to **assign franking** (franked/unfranked split and franking credits) to dividends. Use **New transaction** to add a transaction against an existing holding, and **Add holding** to add a new security together with its opening transaction (date, type, quantity, price, brokerage). When the portfolio is linked to cash accounts, these edits rebuild the virtual cash ledger and re-reconcile linked real accounts automatically.

### Portfolio Settings

Name and administrative details are edited via the **edit (pencil)** button on the portfolio detail page; tax settings live under **Settings → Tax &amp; CGT**:

| Setting                        | Description                                            | Where / Editable   |
| ------------------------------ | ------------------------------------------------------ | ------------------ |
| Portfolio Name                 | Display name used within InvestaLens                   | Pencil edit dialog |
| Icon & Colour                  | Visual identity shown on cards, the header, the dashboard table, and per-portfolio charts | Pencil edit dialog |
| Broker Name                    | Broker / platform name (links to the website)          | Pencil edit dialog |
| Broker Website                 | URL of the broker / platform                           | Pencil edit dialog |
| Client Number                  | Your client reference with the broker                  | Pencil edit dialog |
| Account Number                 | Your account number with the broker                    | Pencil edit dialog |
| Tax Residency                  | Country determining currency, tax rules, and reporting | **No** (permanent) |
| Financial Year End             | End of financial year — defaults to 30 June            | **No** (not editable) |
| Performance Calculation Method | Simple or Compound percentage return calculation       | ⏳ Setting exists but is not currently used |
| Tax Entity Type                | Determines CGT discount applied (AU only)              | Settings → Tax &amp; CGT |

---

## Add a Portfolio

Add additional portfolios to your InvestaLens account to track multiple broker accounts and tax entities.

> **Recommendation:** Create a separate portfolio for each tax entity that you wish to manage.

### Steps to Create a New Portfolio

1. From the sidebar, click **Portfolio**, then the **New Portfolio** button
2. Enter a **Portfolio Name** (display name, can be edited later)
3. Select the **Tax Residency** country

> **Important:** The tax residency cannot be changed once the portfolio is created. It determines the portfolio currency, tax settings, and reports.

4. Select the **Tax Entity Type** (Australia only):
   - **Individuals / Trust** — CGT discount of 50%
   - **Self-Managed Super Fund** — CGT discount of 33⅓%
   - **Company** — CGT discount nil
5. Click **Create Portfolio**

The dialog collects only these three fields. The financial year end defaults to 30 June and is not editable; there is no performance-method field.

After creation, you can add investments by:

- Importing from a CSV file
- Manually adding holdings

---

## Merge Portfolios

Consolidate two portfolios into one — for example after moving holdings between brokers, or when collapsing duplicate accounts.

1. Open the **source** portfolio (the one you want to merge away) and click the **merge** button in the header
2. Choose the **target** portfolio to merge into
3. Confirm

InvestaLens moves **all holdings and transactions** (plus custody fees, cash accounts, and import history) from the source into the target. Holdings of the same instrument are **consolidated** into the target's holding. The target portfolio's **details are kept** (name, broker, account numbers, tax settings), and the **source portfolio is then deleted**.

> **This cannot be undone.** Export a backup first (Settings → Export) if you want a copy of the original structure.

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

Per-portfolio tax settings live under **Settings → Tax & CGT**. Each portfolio has its own card.

### Changing Tax Entity Type (Australia)

1. Click **Settings → Tax & CGT**
2. On the portfolio's card, select the **Tax entity**:
   - **Individuals / Trust** — CGT discount of 50%
   - **Self-Managed Super Fund** — CGT discount of 33⅓%
   - **Company** — CGT discount nil
3. Click **Save**

The same card also sets the **parcel allocation** method and the proposed 2027 settings below.

### Proposed 2027 CGT Regime (projection)

The _Treasury Laws Amendment (Tax Reform No. 1) Bill 2026_ proposes replacing the 50% discount with CPI indexation, plus a 30% minimum tax, from 1 July 2027. **This is not yet law.** InvestaLens models it as an opt-in projection. On the Tax & CGT card you can set:

- **CGT regime** — Current (50% discount) or Proposed 2027 (indexation)
- **2027 transition method** — Apportionment (days-based) or Market value at 1 July 2027
- **Foreign / temporary resident** — disables CGT indexation and the discount
- **Income-support recipient** — exempt from the 30% minimum tax
- **Marginal tax rate on gains** — used to estimate the 30% minimum-tax top-up

Enable the projection itself with the **Show proposed 2027 regime projection** toggle on the CGT report. See [TAX.md](TAX.md#proposed-2027-cgt-regime-projection).

### Instrument Tax Treatment

Under **Settings → Instrument Tax**, override how each instrument is taxed:

- **Auto** — derive from the instrument type (traditional bonds → income, everything else → CGT)
- **CGT** — for listed bonds and hybrid securities
- **Income** — for traditional bonds (the discount/premium is ordinary income)

---

## Sale Allocation Method (CGT)

The sale allocation method determines which buy parcels InvestaLens assigns to a sell trade when calculating capital gains. InvestaLens tracks every parcel you hold — including partially sold parcels — so each unit can only be allocated to one sale, with no risk of double-counting across financial years.

> For full CGT report details including breakdown tabs, locking, and tax planning strategies, see [TAX.md](TAX.md#capital-gains-tax-cgt-report).

### How Parcel Tracking Works

When you record a sell trade, the system matches that sale against your available buy parcels using the selected method. Each parcel has one of three states:

| State              | Description                                                    |
| ------------------ | -------------------------------------------------------------- |
| Available          | Not yet sold; eligible for matching against future sell trades |
| Partially Disposed | Some units sold; remaining units tracked separately            |
| Fully Disposed     | All units sold; no longer available for allocation             |

### Available Methods

| Method                         | Description                                                                                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **First In, First Out (FIFO)** | Shares purchased first are sold first (default, aligns with ATO default)                                                                           |
| **Last In, First Out (LIFO)**  | Shares purchased most recently are sold first                                                                                                      |
| **Minimise Capital Gain**      | Shares with highest purchase price sold first (minimises gain / maximises loss)                                                                    |
| **Maximise Capital Gain**      | Shares with lowest purchase price sold first                                                                                                       |
| **Minimise Capital Gain Tax**  | Considers both purchase price and holding period to minimise overall tax liability; prioritises parcels eligible for CGT discount where beneficial |

### Changing Methods Across Financial Years

You can change the sale allocation method at any time. However, changing the method can alter parcel allocation across all financial years, including prior ones.

**Lock-in feature ⏳:** Locking the sale allocation method for a completed financial year (so it isn't overridden by later method changes) is planned but not yet available. See [GAPS.md](GAPS.md).

### How to Change the Method

1. Go to **Settings → Tax &amp; CGT** and select the **parcel allocation** method on the portfolio's card
2. On the **CGT Report** page, the **Optimise** comparison card shows the assessable gain under all five methods, so you can see which is most tax-effective before changing the setting

> **Note:** InvestaLens does not provide taxation advice. Consult your accountant or tax adviser if unsure which method applies.

---

## Share Your Portfolio

Share your InvestaLens portfolio with other people, such as:

- **Friends & family** — enable anyone to track the performance of your portfolio
- **Share club members** — enable the whole club to track performance and make investment decisions
- **Accountant or financial advisor** — enable them to view your portfolio for professional guidance

### Access Levels

| Level              | Capabilities                                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Read Only**      | View the shared portfolio's detail page; cannot change or modify anything ✅                                                        |
| **Read and Write** | Selectable, but currently grants **read-only** access — write enforcement is ⏳ planned (see [GAPS.md](GAPS.md))                    |
| **Admin**          | Selectable, but currently grants **read-only** access — admin enforcement is ⏳ planned (see [GAPS.md](GAPS.md))                    |

### How to Share Access

1. Go to **Settings → Sharing**
2. Select the **portfolio** to share, enter the person's **email address**, and select the **access level**
3. Click **Share** — a share record is created (no email invitation is sent)

When the recipient signs in with that email, the shared portfolio appears in their **Portfolio** list with a **"Shared" badge**, and they can open its detail page read-only. Shared portfolios are **not** included in the recipient's dashboard, reports, tax reports, or exports.

### Managing Shared Access

1. Go to **Settings → Sharing**
2. Each share is listed with its access-level badge
3. **Remove access**: Click the remove icon next to the user (to change a level, remove the share and create it again — an inline level-change dropdown is not yet available)

---

## Custom Groups

Custom Groups enable you to customise how your holdings are grouped on reports, which is useful for applying your own asset allocation framework.

### Where Custom Groups Can Be Used

- Performance Report (**Group By** option)
- Diversity Report (**Group By** option)

Instruments not assigned to a category appear in an **"Unassigned"** bucket.

### How Custom Groups Work

- A **Custom Group** is a collection of **Categories**
- Categories are not shared between Custom Groups
- Custom Groups are saved at the **account level** — applied to all portfolios in your account
- The "Ungrouped Instruments" list contains holdings from all portfolios in your account

### Creating a Custom Group

1. Go to **Settings → Custom Groups**
2. Name your Custom Group and save it
3. Add categories within the group and name each one
4. Assign instruments to the appropriate category

### Using Custom Groups

To apply a Custom Group, use the **Group By** option on the Performance and Diversity reports. Your Custom Groups are listed alongside the default groupings, and any instrument without a category falls into the **"Unassigned"** bucket.

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

Labels are created and applied under **Settings → Labels**: name the label, save it, then attach holdings to it per label.

### Managing Labels

- **Attach a label to a holding**: On the label's row in Settings → Labels, attach the desired holding
- **Detach a label from a holding**: On the label's row, detach the holding
- **Delete a label**: Click the delete icon next to the label

Once holdings are attached, use the **Label filter** on the Performance Report to report on just those holdings.

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
6. Click **Add Holding**
7. Record the transferred shares as either:
   - **Transfer In**: date = transfer date, quantity = transferred units, unit price = cost base per share
   - **Buy trade**: trade date = transfer date, quantity = transferred units, unit price = cost base per share

### Moving Holdings with Full History

To combine two whole portfolios — including every buy, sell, and dividend — use the **merge** feature instead (see [Merge Portfolios](#merge-portfolios)). Moving a single holding with its full history between portfolios is not yet automated; re-enter (or re-import) its transactions in the destination portfolio.

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

### Supported Input

- Pasted text from broker statements, contract notes, dividend statements, and trade confirmations (any layout)

> **⏳ Planned:** direct upload of PDFs, screenshots, and images. Today, copy the document's text and paste it into the AI Importer.

### Who Is It Most Useful For?

- **Unsupported brokers** — brokers whose spreadsheet format the standard importer cannot process
- **PDF trade confirmations** — upload directly instead of manual entry
- **Opening balances** — quickly import a snapshot from any statement or document
- **Users who prefer simplicity** — upload and let the AI do the formatting work

> **Note:** For brokers with API integration or automatic sync already set up, the AI Importer is not required — trades are already syncing automatically.

### How to Use

1. From your portfolio, open **Import**, then click the **"✨ AI Import"** button
2. Select the document type (Contract Note, Trade Confirmation, Dividend Statement, etc.)
3. Paste the document text into the text area
4. Click **Parse with AI** — Gemini extracts the transactions
5. Review the parsed transactions table
6. Click **Import** to confirm

> **⏳ Note:** direct PDF / image / screenshot upload is a planned enhancement — the current AI Importer works from pasted document text.

### Enabling the AI Importer

The AI Importer requires the `GOOGLE_GENERATIVE_AI_API_KEY` environment variable to be configured for the deployment. When it is not set, the AI Import option is unavailable.

---

## Emergency Fund

> **⏳ To be Implemented (R4).** The Emergency Fund tracker is not yet available — the sections below describe the intended experience.

The Emergency Fund feature lets you define and track a savings target for unexpected expenses, separate from your investment portfolio.

### Why Track an Emergency Fund?

Financial planning best practice recommends maintaining 3–6 months of living expenses in liquid, easily accessible savings before investing. InvestaLens helps you visualise this alongside your investments so you can see your complete financial picture.

### Setting Up Your Emergency Fund

1. Navigate to **Account > Emergency Fund**
2. Set your **target amount** (e.g. 6 months × monthly expenses)
3. Set your **current balance** (amount currently saved)
4. Optionally link a Cash Account that represents your emergency savings

### Emergency Fund Dashboard

| Element         | Description                                            |
| --------------- | ------------------------------------------------------ |
| Target          | Your defined emergency fund goal                       |
| Current Balance | Amount currently held                                  |
| Progress Bar    | Visual indicator showing % of target reached           |
| Months Covered  | Current balance ÷ monthly expenses = months of runway  |
| Status          | 🟢 Fully funded, 🟡 Partially funded, 🔴 Below minimum |

### Configuration Options

| Setting              | Description                                             | Default      |
| -------------------- | ------------------------------------------------------- | ------------ |
| Monthly Expenses     | Your average monthly living costs                       | Manual entry |
| Target Months        | Number of months you want covered                       | 6            |
| Linked Cash Account  | Cash Account representing emergency savings             | None         |
| Include in Net Worth | Whether emergency fund appears in net worth calculation | Yes          |

### How It Interacts with Investing

The Emergency Fund is shown on the main dashboard alongside your portfolio value, helping you answer: "Am I financially secure enough to invest more, or should I top up my emergency fund first?"

> **Note:** The emergency fund is a planning tool only. InvestaLens does not restrict or automate transfers between your emergency fund and investment accounts.

---

## Related Documentation

| Document                                 | Description                                               |
| ---------------------------------------- | --------------------------------------------------------- |
| [GETTING-STARTED.md](GETTING-STARTED.md) | Portfolio setup, CSV import guide, and adding investments |
| [DATA_IMPORT.md](DATA_IMPORT.md)         | Full import architecture and field mapping                |
| [ACCOUNTS.md](ACCOUNTS.md)               | Bank & cash accounts, statement import, and reconciliation |
| [TOOLS.md](TOOLS.md)                     | All performance, allocation, and tax reports              |
| [TAX.md](TAX.md)                         | Australian tax reporting, CGT calculations, and AMIT      |
| [ASSETS.md](ASSETS.md)                   | Supported asset types, custom investments, and exchanges  |
| [ACTIONS.md](ACTIONS.md)                 | Corporate actions (splits, mergers, and demergers)        |
