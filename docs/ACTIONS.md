# InvestaLens Corporate Actions

> **📖 Part of the [InvestaLens User Manual](../USER-MANUAL.md)** | Previous: [Tax Reporting](TAX.md) | Next: [Advanced Analytics](ADVANCED.md)

## Overview

InvestaLens automatically handles most corporate actions — splits, consolidations, name changes, dividends, and more. Some actions require manual recording because they involve a financial decision only you can make.

> **Note:** Check your portfolio regularly for new corporate actions. InvestaLens will notify you by email and show an alert in the Corporate Events section when you log in.

> **Disclaimer:** The guides in this document are suggestions on how to handle corporate actions and are not financial or tax advice. Consult your financial adviser or accountant and review official documents for full details.

**Jump to:**

- [Automation Summary](#automation-summary)
- [Share Splits](#share-splits)
- [Share Consolidations](#share-consolidations)
- [Mergers & Acquisitions](#mergers--acquisitions)
- [Demergers (Spin-offs)](#demergers-spin-offs)
- [Initial Public Offerings (IPOs)](#initial-public-offerings-ipos)
- [Renounceable Rights](#renounceable-rights)
- [Other Corporate Actions](#other-corporate-actions)
- [Deferred Settlement Periods](#deferred-settlement-periods)

---

## Automation Summary

| Corporate Action          | Automated?                                 | Markets        | Notes                                |
| ------------------------- | ------------------------------------------ | -------------- | ------------------------------------ |
| Consolidations            | ✅ Yes                                     | All            | Fully automated                      |
| Share Splits              | ✅ Yes                                     | All            | Fully automated                      |
| Special Dividend          | ✅ Yes                                     | All            | Fully automated                      |
| Return of Capital         | ✅ Yes (ASX & NZX) / ❌ No (other markets) | ASX & NZX only | Manual for other markets             |
| Bonus Shares              | ✅ Yes                                     | All            | Fully automated                      |
| Name Change               | ✅ Yes (ASX & NZX) / ❌ No (other markets) | ASX & NZX only | Manual for other markets             |
| Renounceable Rights       | ❌ No                                      | —              | Requires personal financial decision |
| IPO                       | ❌ No                                      | —              | Record manually                      |
| Share Purchase Plan (SPP) | ❌ No                                      | —              | Record as buy trade                  |
| Mergers & Acquisitions    | ❌ No                                      | —              | Use Merge feature                    |
| Demerger (Spin-off)       | ❌ No                                      | —              | Record manually                      |
| Delisted Company          | ❌ No                                      | —              | Record manually                      |
| Share Buyback             | ❌ No                                      | —              | Record as sell trade                 |
| Broker Transfer           | ❌ No                                      | —              | Record manually                      |
| Share Transfer            | ❌ No                                      | —              | Record manually                      |
| Warrants                  | ❌ No                                      | —              | Record manually                      |
| Stock Options             | ❌ No                                      | —              | Record manually                      |

---

## Share Splits

A share split is a corporate event where a listed company splits its shares in a pre-defined ratio (e.g. 1:10). The market price adjusts so that the market value of the shares does not change. A split does **not** alter the cost base of the holding.

**Why companies split:** A company may implement a split because it feels its per-unit share price has become too high.

### How InvestaLens Handles Splits

- InvestaLens typically handles share splits automatically without issue
- The split adjustment is created on the **action date** (the date the split takes effect)
- The split ratio appears in the Corporate Actions sidebar as soon as it is announced (potentially weeks before it takes effect)
- Once the split is applied, price updates resume under the main share code

### During a Deferred Settlement Period

- Price updates pause under the main share code for 1–3 weeks
- The holding temporarily trades under a new code (e.g. DTL becomes DTLDA)
- Once the deferred settlement period ends, the holding reverts to its main code and prices update again

### Purchasing During Deferred Settlement

If you purchase shares while the company is in deferred settlement, record the new shares under the **main share code** (not the DA code), as the DA code will revert. Note that prices and quantities during this period assume the split has already taken effect.

---

## Share Consolidations

A consolidation (reverse split) is a corporate event where a listed company merges its shares in a pre-defined ratio (e.g. 10:1). The market price adjusts so that market value does not change. A consolidation does **not** alter the cost base of the holding.

**Why companies consolidate:** A company may implement a consolidation because it feels its per-unit share price has become too low.

### How InvestaLens Handles Consolidations

- InvestaLens typically handles consolidations automatically
- The consolidation adjustment is created on the **action date**
- The consolidation ratio appears in the Corporate Actions sidebar as soon as it is announced
- A deferred settlement period (1–3 weeks) may occur during processing

### During Deferred Settlement

Same as share splits — the holding trades temporarily under a DA code (e.g. AHZ becomes AHZDA). Price updates resume once the settlement period ends and the holding reverts to its main code.

---

## Mergers & Acquisitions

The **Merge this Holding** feature is designed for situations where you hold shares in a listed company that is wholly acquired by another listed company.

### How to Record a Merger

1. Click on the stock that has been acquired on the Portfolio Investments Page
2. Go to the **Edit Holding** tab and click **Merge this Holding**
3. Enter:
   - **Date of merger**
   - **New Holding** (the acquiring company)
   - **Quantity** (new shares received, based on the announced ratio)
4. Click **Save Changes**

InvestaLens will do the rest.

### How It Works

| Action                       | What Happens                                                                                                      |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Cost base                    | Transferred from the cancelled holding to the new holding                                                         |
| Performance                  | Market value at merge date is captured for both the cancelled and new holdings, ensuring no performance is "lost" |
| Existing holding in acquirer | Additional shares from the merger are simply added to your existing holding                                       |
| Sell the new shares          | CGT calculation traces back through the merge chain to find original purchase history                             |

### Merge Chain Tracking

InvestaLens follows merger history backwards through multiple merges to retrieve original purchase prices for CGT calculations.

**Example:** SIV.ASX → merged into EHL.ASX → later merged into HPI.ASX

If you sell HPI shares, InvestaLens follows the chain back through EHL to SIV to retrieve the original buy price.

### When to Use Merge

- A holding has been wholly acquired by another listed company
- You receive shares in the acquirer in exchange for your existing shares

### FAQ

- **What happens when I save?** InvestaLens creates a merge (cancel) transaction against the old holding (similar to a sell), and a merge (buy) transaction on the new holding containing the cost base and market value from the cancelled holding.
- **Where do I find the quantity?** The companies will announce a ratio (e.g. 1 new share for every 3 old shares). You should also receive notifications with the exact number of new shares you'll receive.

---

## Demergers (Spin-offs)

A demerger occurs when a company separates part of its business into a new, independently listed entity. Existing shareholders receive shares in the new company.

### How to Record a Demerger

Demergers are **not automated** because they require a cost base allocation decision. You typically need to:

1. **Record a capital return** on the original holding (reducing its cost base by the allocated demerger amount)
2. **Record a buy trade** on the new holding with a zero or reduced cost base (as per the company's demerger booklet)

> **Important:** The demerger booklet issued by the company will specify the cost base allocation between the original and new holdings. Follow these instructions for correct CGT treatment.

---

## Initial Public Offerings (IPOs)

An IPO is the first sale of stock by a company on a public exchange (also known as a listing).

### When Will a Newly Listed Company Be Available?

It may take up to a week (5 business days) for data providers to supply information on newly listed companies. During this time:

- The security may not appear in search results
- Automatic imports may fail as the system cannot locate the security

### How to Record IPO Shares

**Option 1: Wait a few days**

- Wait for the security to appear in InvestaLens (usually within a week)
- All daily prices will be available going back to the first day of trading

**Option 2: Create a Custom Investment**

- Create a Custom Investment immediately
- Later, merge it to the listed security once it becomes available

### Recording the Trade

Depending on how you participated:

- **Via your broker:** Record as a standard buy trade (date, price, quantity, brokerage)
- **Direct Stock Purchase Plan (issuer-sponsored):** Record as a buy trade or opening balance using information from the company

---

## Renounceable Rights

Renounceable rights are offers issued by a company to shareholders to purchase more shares, typically at a discount. They have a value and can be traded separately.

### Shareholder Options

When you receive renounceable rights, you have three choices:

1. **Take up the rights** — Buy more shares at the offer price
2. **Sell the rights** on the market
3. **Let them lapse** — Do nothing (may receive a residual cash payment)

### Why InvestaLens Cannot Automate This

Renounceable rights require a personal financial decision — InvestaLens cannot know which option you chose.

### How to Record Each Scenario

#### Took Up Rights (Purchased New Shares)

Record a **buy trade** under the main share code with the quantity, price, and date you acquired the new shares.

#### Received Cash Payment (Did Not Take Up Rights)

In Australia, this may generally be recorded as an **unfranked dividend** under the main share code. Check with your adviser for the appropriate tax treatment.

#### Purchased Additional Rights on Market

Record a buy trade under the **renounceable rights share code** (e.g. WBCR for Westpac rights) with the date and cost base you purchased them for.

#### Sold Rights on Market

1. Record a **buy trade** with a zero cost base at the original entitlement date
2. Record a **sell trade** for the amount you sold them for

---

## Other Corporate Actions

### Share Purchase Plan (SPP)

Record as a standard **buy trade** with the SPP price, quantity, and allotment date.

### Share Buyback

Record as a **sell trade**. The company will advise the breakdown between capital and dividend components for tax purposes.

### Delisted Company

If a company is delisted (e.g. due to administration):

- Record a sell trade at $0 (or the final price received) to close the position
- This will create a capital loss in your CGT Report

### Bonus Shares (Scrip Issue)

Automated by InvestaLens. Bonus shares are recorded as an adjustment that increases your quantity without changing the cost base (the per-share cost base is diluted across the new total).

### Return of Capital

- **ASX & NZX**: Automated — recorded as an adjustment that reduces your cost base
- **Other markets**: Record manually as a capital return adjustment

### Name Change / Ticker Change

- **ASX & NZX**: Automated — the holding updates to the new name/code
- **Other markets**: May need to be handled manually

---

## Deferred Settlement Periods

Many corporate actions (splits, consolidations, some rights issues) involve a deferred settlement period lasting 1–3 weeks.

### What Happens During Deferred Settlement

| Effect                | Details                                                                      |
| --------------------- | ---------------------------------------------------------------------------- |
| Temporary code        | The holding trades under a new code (original + "DA", e.g. AHZ → AHZDA)      |
| Price updates pause   | No price updates under the main share code during this period                |
| Settlement deferred   | T+3 settlement is deferred until the exchange-decided end date               |
| Reverts automatically | Once the period ends, the holding reverts to its main code and prices resume |

### Tips

- **Do not create a separate holding** for the DA code — it will revert automatically
- **Use the Share Checker** to view prices under the DA code if you need current pricing during this period
- **Record new purchases** under the main share code (not the DA code) to avoid extra work later
- If prices during deferred settlement reflect the post-action state, adjust accordingly for trades dated before the action date

---

## Related Documentation

| Document                                 | Description                                                     |
| ---------------------------------------- | --------------------------------------------------------------- |
| [TAX.md](TAX.md)                         | CGT implications of corporate actions and cost base adjustments |
| [ACCOUNT.md](ACCOUNT.md)                 | Portfolio settings, share transfers between portfolios          |
| [ASSETS.md](ASSETS.md)                   | Supported asset types and custom investments                    |
| [TOOLS.md](TOOLS.md)                     | Reports for tracking corporate action impacts                   |
| [GETTING-STARTED.md](GETTING-STARTED.md) | Adding and recording investments                                |
