# InvestaLens Corporate Actions

> **📖 Part of the [InvestaLens User Manual](../USER-MANUAL.md)** | Previous: [Tax Reporting](TAX.md) | Next: [Advanced Analytics](ADVANCED.md)

> **Implementation Status (R1 MVP)**
>
> | Feature                              | Status                                |
> | ------------------------------------ | ------------------------------------- |
> | Stock splits                         | ✅ Implemented                        |
> | Bonus issues                         | ✅ Implemented                        |
> | Return of capital                    | ✅ Implemented                        |
> | Rights issues (enter CGT parcel engine) | ✅ Implemented                     |
> | Mergers (scrip-for-scrip cost-base transfer) | ✅ Implemented (Corporate Actions page) |
> | DRP recording (toggle + manual BUY)  | ✅ Implemented (dedicated DRP form ⏳) |
> | Corporate actions UI page            | ✅ Implemented                        |
> | Share consolidations                 | ✅ Supported via split with ratio < 1 |
> | Demergers                            | ⏳ To be Implemented                  |
> | IPO recording                        | ⏳ To be Implemented                  |
> | Automated corporate action detection | ⏳ To be Implemented                  |
> | Name/ticker change tracking          | ⏳ To be Implemented                  |

## Overview

In InvestaLens, **all corporate actions are recorded manually** through the guided **Corporate Actions** page (open a holding, then click **Corporate Actions**) — splits, consolidations, bonus issues, returns of capital, rights issues, and mergers/acquisitions. Only **dividends** are generated automatically from market data.

> **⏳ Planned:** automatic corporate-action detection and email alerts are not yet available — check your registry/broker notifications and record actions as they occur. See [GAPS.md](GAPS.md).

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

| Corporate Action          | Automated? | How to Record                                           |
| ------------------------- | ---------- | -------------------------------------------------------- |
| Dividends                 | ✅ Yes     | Auto-generated from market data                           |
| Share Splits              | ❌ No      | Corporate Actions page → Stock Split                      |
| Consolidations            | ❌ No      | Corporate Actions page → Stock Split with ratio &lt; 1    |
| Bonus Shares              | ❌ No      | Corporate Actions page → Bonus Issue                      |
| Return of Capital         | ❌ No      | Corporate Actions page → Return of Capital                |
| Renounceable Rights       | ❌ No      | Corporate Actions page → Rights Issue (personal decision) |
| Mergers & Acquisitions    | ❌ No      | Corporate Actions page → Merger / Acquisition             |
| IPO                       | ❌ No      | Record manually as a buy trade                            |
| Share Purchase Plan (SPP) | ❌ No      | Record as buy trade                                       |
| Demerger (Spin-off)       | ❌ No      | Record manually (⏳ dedicated flow planned)               |
| Delisted Company          | ❌ No      | Record manually                                           |
| Share Buyback             | ❌ No      | Record as sell trade                                      |
| Broker / Share Transfer   | ❌ No      | Record manually                                           |
| Name Change               | ❌ No      | ⏳ Tracking planned; handle manually                      |
| Warrants / Stock Options  | ❌ No      | Record manually                                           |

> **⏳ Planned:** automatic detection of splits, bonus issues, returns of capital, and name changes. See [GAPS.md](GAPS.md).

---

## Share Splits

A share split is a corporate event where a listed company splits its shares in a pre-defined ratio (e.g. 1:10). The market price adjusts so that the market value of the shares does not change. A split does **not** alter the cost base of the holding.

**Why companies split:** A company may implement a split because it feels its per-unit share price has become too high.

### How to Record a Split

1. Open the holding and click **Corporate Actions**
2. Select **Stock Split**, enter the **action date** and the split **ratio**
3. Click **Record Action** — quantities adjust; the cost base is unchanged

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

### How to Record a Consolidation

Record it as a **Stock Split with a ratio below 1** (e.g. a 10:1 consolidation is a 0.1 ratio) on the holding's Corporate Actions page. Note that a deferred settlement period (1–3 weeks) may occur on-market during processing.

### During Deferred Settlement

Same as share splits — the holding trades temporarily under a DA code (e.g. AHZ becomes AHZDA). Price updates resume once the settlement period ends and the holding reverts to its main code.

---

## Mergers & Acquisitions

The **Merger / Acquisition** action is designed for situations where you hold shares in a listed company that is wholly acquired by another listed company.

### How to Record a Merger

1. Open the acquired holding and click **Corporate Actions**
2. Select **Merger / Acquisition** and enter:
   - **Date of merger**
   - **New Holding** (the acquiring company)
   - **Quantity** (new shares received, based on the announced ratio)
3. Click **Record Action**

InvestaLens will do the rest.

### How It Works

InvestaLens implements a **scrip-for-scrip rollover-style cost-base transfer**:

| Action                       | What Happens                                                                                      |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| Old holding                  | A **MERGER_OUT** transaction closes out the acquired holding's units                                |
| New holding                  | A **MERGER_IN** transaction adds the new shares, **priced so that the total cost base is preserved** — the old holding's cost base carries over to the new shares |
| CGT                          | MERGER_IN shares enter the CGT parcel engine as parcels with the transferred cost base, so a later sale computes gains against the original cost base |
| Existing holding in acquirer | Additional shares from the merger are simply added to your existing holding                        |

### When to Use Merge

- A holding has been wholly acquired by another listed company
- You receive shares in the acquirer in exchange for your existing shares

### FAQ

- **What happens when I save?** InvestaLens creates a MERGER_OUT transaction against the old holding (similar to a sell), and a MERGER_IN transaction on the new holding carrying over the cancelled holding's cost base.
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

Record a **Rights Issue** on the holding's Corporate Actions page with the quantity, price, and date you acquired the new shares. Rights-issue shares **enter the CGT parcel engine** as a new parcel at the issue price, so discount eligibility and cost base are tracked correctly. ✅

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

### Dividend Reinvestment (DRP)

Use the **DRP toggle** on the holding page to mark the holding as participating in a dividend reinvestment plan, then record each reinvestment as a manual **BUY** (date = payment date, quantity = shares allotted, price = DRP issue price, brokerage = 0). The dividend itself remains recorded as income. _(A dedicated DRP-recording form is ⏳ planned — see [GETTING-STARTED.md](GETTING-STARTED.md#dividend-reinvestments-drp).)_

### Share Buyback

Record as a **sell trade**. The company will advise the breakdown between capital and dividend components for tax purposes.

### Delisted Company

If a company is delisted (e.g. due to administration):

- Record a sell trade at $0 (or the final price received) to close the position
- This will create a capital loss in your CGT Report

### Bonus Shares (Scrip Issue)

Record a **Bonus Issue** on the holding's Corporate Actions page. Bonus shares increase your quantity without changing the total cost base (the per-share cost base is diluted across the new total). ✅

### Return of Capital

Record a **Return of Capital** on the holding's Corporate Actions page — it is recorded as an adjustment that reduces your cost base.

### Name Change / Ticker Change

⏳ Name/ticker change tracking is not yet available — handle manually (see [GAPS.md](GAPS.md)).

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
