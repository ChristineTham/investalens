# InvestaLens Asset Support

> **📖 Part of the [InvestaLens User Manual](../USER-MANUAL.md)** | Previous: [Data Import](DATA_IMPORT.md) | Next: [Account Management](ACCOUNT.md)

> **Implementation Status (R1 MVP)**
>
> | Feature                                             | Status                             |
> | --------------------------------------------------- | ---------------------------------- |
> | Equities (ASX and 60+ exchanges via Yahoo Finance)  | ✅ Implemented                     |
> | ETFs and managed funds                              | ✅ Implemented                     |
> | Bonds / fixed interest (with coupon, maturity, YTM) | ✅ Implemented                     |
> | Custom investments                                  | ✅ Implemented (schema supports)   |
> | Instrument search (Yahoo Finance)                   | ✅ Implemented                     |
> | Cryptocurrencies                                    | ✅ Implemented (via Yahoo Finance) |
> | Stock information (profile, fundamentals, analysts, news, financials) | ✅ Implemented   |
> | Net Worth & Liabilities                             | ⏳ To be Implemented (R4)          |
> | Property tracking                                   | ⏳ To be Implemented               |
> | Multi-currency pricing                              | ⏳ To be Implemented (R3)          |

## Overview

InvestaLens supports tracking a wide range of investment types — from listed equities and ETFs to property, cryptocurrencies, and fixed income. This document covers every asset type you can track and how to add each one.

**Jump to:**

- [How to Search and Add an Investment](#how-to-search-and-add-an-investment)
- [Equities](#equities)
- [Property](#property)
- [Cash and Fixed Income](#cash-and-fixed-income)
- [Alternatives](#alternatives)
- [Other Instruments](#other-instruments)
- [Custom Investments](#custom-investments)
- [Supported Stock Exchanges](#supported-stock-exchanges)
- [What InvestaLens Doesn't Track](#what-investalens-doesnt-track)
- [Net Worth & Liabilities](#net-worth--liabilities)

---

## How to Search and Add an Investment

InvestaLens supports thousands of securities across global exchanges. To add a holding:

1. From your portfolio, click **Add Investment**
2. Search by ticker code (e.g. VAS, AAPL) or company/fund name
3. Select the correct security from the results and click **Add Holding**
4. Enter your trade details and click **Save**

> **Note:** If your investment isn't found in the search, you can add it as a [Custom Investment](#custom-investments) and manage prices manually. Most unlisted assets — property, term deposits, precious metals — use this approach.

---

## Equities

### Listed Shares (ASX & International)

Shares listed on a supported stock exchange are tracked automatically — InvestaLens fetches daily prices and handles corporate actions.

Supported exchanges include ASX, NZX, NYSE, NASDAQ, LSE, TSX, and many more. See [Supported Stock Exchanges](#supported-stock-exchanges) for the full list.

### ETFs (Exchange Traded Funds)

ASX-listed and international ETFs are fully supported. InvestaLens automatically populates estimated tax components during the year, and for supported providers applies the finalised Annual Tax Statement at EOFY.

### LICs (Listed Investment Companies)

LICs are traded on the ASX like ordinary shares and are tracked automatically. AMIT tax components for LICs are not auto-updated — you will need to enter them manually at EOFY.

### REITs and Stapled Securities

A-REITs and infrastructure trusts listed on the ASX are supported automatically for price tracking. Distributions are classified as trust income and require manual AMIT entry at EOFY.

### Managed Funds

InvestaLens supports both listed and unlisted managed funds.

- **Listed managed funds** are traded on an exchange like shares and can be added by searching their ticker code (e.g. FOR.ASX for the Forager Australian Shares Fund)
- **Unlisted managed funds** are not listed on an exchange — you invest directly with the fund manager or through a platform. Search by APIR code or fund name when adding to your portfolio

AMIT tax components must be entered manually from your Annual Tax Statement.

### Unit Trusts

Unit trusts operate similarly to managed funds and are tracked the same way — add as a custom investment if unlisted, or search by ticker if listed.

### Stock Information

Beyond price tracking, every share and ETF holding carries rich company information sourced from Yahoo Finance via the Python `yfinance` backend. It is refreshed alongside prices (**Settings → Market Data → "Fetch Prices"**) and displayed in a tabbed **Company Information** panel on the holding detail page:

| Section        | Contents                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------ |
| Overview       | Business summary, sector/industry/country, website, and key fundamentals (market cap, P/E, forward P/E, price/book, EPS, beta, dividend yield, profit margin, ROE, revenue growth, 52-week high/low) |
| Analysts       | Price targets (low/mean/median/high with upside vs current price), recommendation trend chart, and recent upgrades/downgrades |
| Financials     | Five-year income-statement summary (revenue, gross profit, EBITDA, net income)                   |
| News           | Recent headlines with publisher, date and links                                                  |
| Events         | Next earnings date, ex-dividend/dividend dates, and EPS estimates                                 |

Fetched data is cached per instrument (`InstrumentInfo`) and shared across portfolios. Bonds, cash and currencies are skipped. Sector, industry and country are also backfilled onto the instrument when missing, improving diversity reports.

---

## Property

### Investment Property

InvestaLens does not connect to property valuations, but you can track investment properties as a [Custom Investment](#custom-investments) by manually updating the estimated value periodically.

### REITs

Listed property trusts (REITs) are tracked automatically as equities — see REITs and stapled securities above.

---

## Cash and Fixed Income

### Cash Accounts

InvestaLens has a dedicated Cash Account feature to track cash holdings alongside your investment portfolio. You can log deposits, withdrawals, interest, and fees — giving you a complete picture of your portfolio.

**Cash Account capabilities:**

| Feature                       | Description                                |
| ----------------------------- | ------------------------------------------ |
| Track bank/savings accounts   | Record balances and interest earned        |
| Track brokerage cash accounts | Monitor uninvested cash at your broker     |
| Track term deposits           | Fixed interest with maturity dates         |
| Foreign currency accounts     | Track cash held in foreign currencies      |
| Sync trades and payouts       | Link investment transactions to cash flows |
| Export                        | Download transaction history as CSV        |

**Cash Account operations:**

- Create, rename, or delete a Cash Account
- Add, search, edit, or delete cash transactions
- Sync trades and payouts from your investment portfolio
- Export cash account history

### Term Deposits and Fixed Interest

Term deposits and other fixed interest securities can be tracked using the Custom Investment feature set to the **Fixed Interest** investment type.

**Setting up a term deposit:**

1. Click **Add Investment** from the portfolio page
2. Select **Create Custom Investment**
3. Select **Fixed Interest** from the Investment Type dropdown
4. Complete the form:

| Field               | Recommendation                                        |
| ------------------- | ----------------------------------------------------- |
| Instrument Code     | Short abbreviation (acts as the ticker)               |
| Instrument Name     | Full name of the holding                              |
| Investment Type     | Fixed Interest                                        |
| Face Value per Unit | Set to $1 (simplest approach)                         |
| Coupon Rate         | Your interest rate/yield                              |
| Income Type         | Dividends or Interest                                 |
| Payment Frequency   | How often interest is paid                            |
| First Payment Date  | Must be after the Trade Date and before Maturity Date |
| Maturity Date       | When the term deposit ends                            |
| Quantity            | The dollar amount invested (since Face Value = $1)    |

**Interest calculation:**

```
Interest = Face Value per Unit × Coupon Rate × Quantity
```

**Common errors to avoid:**

- **Face Value per Unit set too high** — Keep it at $1 and use Quantity for the investment amount
- **First Payment Date before Trade Date** — Ensure correct date sequencing: Trade Date → First Payment Date → Maturity Date

### Bonds

InvestaLens supports tracking listed bonds, unlisted/OTC bonds, and bond funds with full fixed income analytics.

#### Adding Bonds

| Bond Type                 | How to Add                                                        |
| ------------------------- | ----------------------------------------------------------------- |
| **Listed bonds**          | Search by name or ticker on supported exchanges (ASX, LSE, NYSE)  |
| **Unlisted/OTC bonds**    | Create as Custom Investment with **Fixed Interest** type          |
| **UK gilts**              | Listed on LSE — search and add directly                           |
| **Corporate bonds (OTC)** | Custom Investment with coupon rate, maturity date, and face value |
| **Bond ETFs/Funds**       | Search by ticker (e.g. VAF, IAF, AGG, BND)                        |

#### Bond-Specific Fields

When adding a bond (listed or custom), InvestaLens tracks:

| Field                | Description                                                  |
| -------------------- | ------------------------------------------------------------ |
| Face Value (Par)     | Nominal value per unit (typically $100 for Australian bonds) |
| Coupon Rate          | Annual interest rate (%)                                     |
| Payment Frequency    | Monthly, Quarterly, Semi-Annual, or Annual                   |
| Maturity Date        | When the bond matures and principal is returned              |
| Purchase Yield (YTM) | Yield to maturity at time of purchase                        |
| Credit Rating        | Issuer credit rating (AAA to unrated)                        |

#### Bond Portfolio Analytics

| Feature                   | Description                                             |
| ------------------------- | ------------------------------------------------------- |
| Yield to Maturity         | Weighted average YTM across all bond holdings           |
| Modified Duration         | Portfolio sensitivity to interest rate changes          |
| Weighted Average Maturity | Average time to maturity weighted by market value       |
| Credit Quality Breakdown  | Distribution of holdings by credit rating               |
| Maturity Ladder           | Visual timeline of upcoming maturities and cash flows   |
| Coupon Calendar           | Schedule of upcoming coupon payments with amounts       |
| Income Forecast           | Projected income from coupons over next 12 months       |
| Accrued Interest          | Interest earned but not yet paid since last coupon date |

#### Tracking Bond Income & Fees

Bond coupon payments are recorded as **COUPON** transactions and principal repayments (e.g. amortising / indexed annuity bonds) as **RETURN_OF_CAPITAL**. Custody / management fees are recorded as portfolio **fee invoices**. The Bonds page surfaces summary totals for coupon income, principal repaid, and custody fees, plus an income-payments table and a fees table. InvestaLens also:

- Calculates expected coupon amounts based on face value × coupon rate × frequency
- Flags missing payments if a scheduled coupon is not recorded
- Tracks running yield vs purchase yield
- Separates capital gain/loss from income return
- Records accrued interest paid/received on a trade separately from the cost base

#### Importing from FIIG Securities

The FIIG data-extract workbook (`.xls`) is imported in one step via **Import → Custom Import → FIIG Data Extract**. It reads the workbook's separate sheets and consolidates trades (BUY/SELL with accrued interest), income payments (coupons and principal repayments), custody fees, and security metadata (type, sector, coupon rate, payment frequency, maturity). All rows are deduplicated against existing data.

#### Updating Bond Prices

Unlisted/OTC bond prices are not available from Yahoo Finance. Instead, update them from the FIIG Securities rate sheet via **Settings → Bond Prices → “Fetch Bond Prices”**. Holdings are matched by ISIN (the bond `code`), and the current clean capital price is stored as today's price. Coupon rate, maturity, and sector are backfilled where missing.

#### Bonds in Return Calculations

Bond returns follow the same model as the rest of the portfolio: cost base includes any brokerage, market value uses the latest stored price per $1 of face value, coupon income and principal repayments count as income, and custody fees reduce total gain. Accrued interest paid on a purchase is netted out of income (it is recovered at the next coupon); accrued interest received on a sale adds to income.

#### Supported Bond Platforms

| Platform                          | Region    | Notes                                                     |
| --------------------------------- | --------- | --------------------------------------------------------- |
| FIIG Securities                   | Australia | Corporate and government bonds, negotiable at OTC         |
| ASX-listed bonds                  | Australia | Exchange-traded Australian government and corporate bonds |
| XTBs (Exchange Traded Bond units) | Australia | ASX-listed units over corporate bonds                     |
| Interactive Brokers               | Global    | Listed bonds across multiple markets                      |

#### Maturity Events

When a bond matures, InvestaLens:

1. Alerts you in advance (configurable: 30, 60, 90 days)
2. Records the redemption at face value as a SELL transaction
3. Calculates final capital gain/loss (purchase price vs par)
4. Prompts for reinvestment decision

---

## Alternatives

### Cryptocurrencies

Many popular cryptocurrencies (Bitcoin, Ethereum, etc.) are supported directly — search by name or ticker. For unsupported coins, use a [Custom Investment](#custom-investments).

### Precious Metals

Gold, silver, and other precious metals can be tracked as a Custom Investment using spot price or your own valuation.

### Physical Assets

Physical assets such as art, jewellery, and collectibles can be tracked as a Custom Investment by manually updating the estimated value.

### Foreign Currency

You can track foreign currency holdings alongside your investments. Foreign currencies are listed on the FX: Foreign Exchange Market and their value is automatically converted to your portfolio's base currency.

**Adding a foreign currency holding:**

1. From your portfolio, click **Add Investment**
2. Search by currency code (e.g. USD, EUR, GBP)
3. Select the currency from the FX: Foreign Exchange Market results
4. Choose transaction type:
   - **Buy** — if you purchased the currency at a known date and rate
   - **Opening Balance** — if you already hold the currency and want to record the current balance

**Buy trade fields:**

- Trade date
- Quantity — amount of foreign currency purchased
- Exchange rate at the date of the trade (or use the automatically provided rate)
- Brokerage fees (optional, in either currency)

**Opening Balance fields:**

- Cost base — total cost of the foreign currency at the opening balance date
- Quantity — amount of foreign currency held
- Market value is calculated automatically using the current exchange rate (can be overridden)

Once added, foreign currency appears under the Foreign Exchange Market (FX) group on your portfolio page with performance and exchange rate history.

### Superannuation

Your superannuation balance can be tracked as a Custom Investment to include it in your overall net worth view. Only accumulation funds are supported (not defined benefit).

---

## Other Instruments

### Warrants and Stock Options

- **ASX-listed warrants** can be searched and added directly
- **Employee stock options** and unlisted warrants are added as custom investments
- Record grants, exercises, and expirations

### Dividend Reinvestment Plans (DRP)

If your broker automatically reinvests dividends as new shares, InvestaLens can track this automatically. DRP shares are recorded as buy trades funded by the dividend payment.

---

## Custom Investments

The Custom Investment feature allows you to track any unlisted or unsupported investment, including:

- Investment property
- Peer-to-peer lending
- Private equity
- Unlisted shares
- Holdings on unsupported stock exchanges
- Any other asset with a quantifiable value

**Creating a Custom Investment:**

1. Click **Add Investment** from the portfolio page
2. Select **Create Custom Investment**
3. Complete the form fields (instrument code, name, investment type, country, etc.)
4. Enter trade details and save

Once created, you can record dividends and trades against it just like any other holding.

### Updating Prices

You will need to update the share price manually to receive up-to-date performance information. The share price can be updated via the Individual Holding Page — click **Manage** in custom investment prices from the Price Comparison section.

### Managing Prices Using a CSV File

The manage prices page allows you to:

- Enter new prices and change existing prices (click on prices to edit)
- Import a CSV file containing share prices
- Directly supports historic price files downloaded from Google Finance or Yahoo Finance

### Merging a Custom Investment to a Listed Holding

If you have added a custom investment that is now listed or that InvestaLens has started supporting, you can merge it to the listed security without losing any data.

---

## Supported Stock Exchanges

InvestaLens supports over 60 stock exchanges and managed funds worldwide. Automatically track price, performance and dividends from 700,000+ global stocks, crypto, ETFs and funds.

> **Note:** If a market you invest in is not listed below, you can add your holding as a [Custom Investment](#custom-investments).

| Country              | Exchange                                       | Type           | Code     | Price Delay |
| -------------------- | ---------------------------------------------- | -------------- | -------- | ----------- |
| Australia            | Australian Securities Exchange                 | Stock Exchange | ASX      | 20 minutes  |
| Australia            | Australia Managed Funds                        | Managed Fund   | FundAU   | Daily       |
| Australia            | Cboe Australia                                 | Stock Exchange | CXA      | 20 minutes  |
| Australia            | Managed Funds                                  | Managed Fund   | mFund    | Daily       |
| Austria              | Vienna Stock Exchange                          | Stock Exchange | VIE      | Daily       |
| Belgium              | Euronext Brussels                              | Stock Exchange | EURONEXT | End of day  |
| Brazil               | B3 BOVESPA                                     | Stock Exchange | BVMF     | End of day  |
| Canada               | Canadian Securities Exchange                   | Stock Exchange | CNSX     | End of day  |
| Canada               | Toronto TSX Ventures Exchange                  | Stock Exchange | CVE      | End of day  |
| Canada               | Neo Exchange                                   | Stock Exchange | NEO      | End of day  |
| Canada               | Toronto Stock Exchange                         | Stock Exchange | TSE      | End of day  |
| Canada               | Canadian Mutual Funds                          | Managed Fund   | FundCA   | Daily       |
| China                | Hong Kong Stock Exchange                       | Stock Exchange | HKG      | End of day  |
| China                | Shenzhen Stock Exchange                        | Stock Exchange | SHE      | End of day  |
| China                | Shanghai Stock Exchange                        | Stock Exchange | SHG      | End of day  |
| Czech Republic       | Prague Stock Exchange                          | Stock Exchange | PSE      | End of day  |
| Denmark              | Nasdaq Nordic Copenhagen                       | Stock Exchange | CSE      | End of day  |
| Finland              | Nasdaq Nordic Helsinki                         | Stock Exchange | HEL      | End of day  |
| France               | Euronext Paris                                 | Stock Exchange | EURONEXT | End of day  |
| Germany              | Deutsche Börse Frankfurt Stock Exchange        | Stock Exchange | FRA      | End of day  |
| Germany              | Deutsche Börse Xetra                           | Stock Exchange | XETR     | End of day  |
| Greece               | Athens Stock Exchange                          | Stock Exchange | ASE      | End of day  |
| Hungary              | Budapest Stock Exchange                        | Stock Exchange | BDP      | End of day  |
| Iceland              | Nasdaq Nordic Iceland                          | Stock Exchange | ICE      | End of day  |
| India                | Bombay Stock Exchange Limited                  | Stock Exchange | BSE      | End of day  |
| India                | National Stock Exchange of India               | Stock Exchange | NSE      | End of day  |
| Indonesia            | Indonesia Stock Exchange                       | Stock Exchange | IDX      | End of day  |
| Ireland              | Irish Funds                                    | Managed Fund   | FundIE   | Daily       |
| Ireland              | Euronext Dublin                                | Stock Exchange | DUB      | End of day  |
| Israel               | Tel Aviv Stock Exchange                        | Stock Exchange | TLV      | End of day  |
| Italy                | Borsa Italiana Milan Stock Exchange            | Stock Exchange | BIT      | End of day  |
| Japan                | Tokyo Stock Exchange                           | Stock Exchange | TYO      | End of day  |
| Luxembourg           | Luxembourg Managed Funds                       | Managed Fund   | FundLU   | End of day  |
| Malaysia             | Bursa Malaysia Stock Exchange                  | Stock Exchange | KLS      | End of day  |
| Mexico               | Bolsa Mexicana de Valores                      | Stock Exchange | BMV      | End of day  |
| Netherlands          | Euronext Amsterdam                             | Stock Exchange | EURONEXT | End of day  |
| New Zealand          | New Zealand Stock Exchange                     | Stock Exchange | NZX      | 20 minutes  |
| New Zealand          | New Zealand Managed Funds                      | Managed Fund   | FundNZ   | Daily       |
| Norway               | Oslo Stock Exchange                            | Stock Exchange | OSL      | End of day  |
| Peru                 | Bolsa de Valores de Lima                       | Stock Exchange | BVL      | End of day  |
| Philippines          | Philippine Stock Exchange                      | Stock Exchange | PHS      | End of day  |
| Poland               | Warsaw Stock Exchange                          | Stock Exchange | WAR      | End of day  |
| Portugal             | Euronext Lisbon                                | Stock Exchange | EURONEXT | End of day  |
| Romania              | Bucharest Stock Exchange                       | Stock Exchange | BVB      | End of day  |
| Russia               | Moscow Exchange                                | Stock Exchange | MISX     | End of day  |
| Singapore            | Singapore Exchange                             | Stock Exchange | SGX      | End of day  |
| South Africa         | Johannesburg Stock Exchange                    | Stock Exchange | JSE      | End of day  |
| South Korea          | Korean Securities Dealers Automated Quotations | Stock Exchange | KOSDAQ   | End of day  |
| South Korea          | Korea Exchange                                 | Stock Exchange | KRX      | End of day  |
| Spain                | Bolsas y Mercados Españoles                    | Stock Exchange | BME      | End of day  |
| Sweden               | Nasdaq Nordic Stockholm                        | Stock Exchange | STO      | End of day  |
| Switzerland          | SIX Swiss Exchange                             | Stock Exchange | SWX      | End of day  |
| Taiwan               | Taiwan Stock Exchange                          | Stock Exchange | TAI      | End of day  |
| Thailand             | Stock Exchange of Thailand                     | Stock Exchange | BKK      | End of day  |
| Turkey               | Borsa Istanbul                                 | Stock Exchange | BIST     | End of day  |
| United Arab Emirates | Abu Dhabi Stock Exchange                       | Stock Exchange | ADX      | Daily       |
| United Kingdom       | London Stock Exchange                          | Stock Exchange | LSE      | 15 minutes  |
| United Kingdom       | UK Mutual Funds                                | Managed Fund   | FundUK   | Daily       |
| United Kingdom       | UK Life and Pension Funds                      | Managed Fund   | FundUK   | Daily       |
| United States        | NYSE American                                  | Stock Exchange | AMEX     | 15 minutes  |
| United States        | BATS Exchange                                  | Stock Exchange | BATS     | 15 minutes  |
| United States        | NASDAQ Stock Exchange                          | Stock Exchange | NASDAQ   | 15 minutes  |
| United States        | The New York Stock Exchange                    | Stock Exchange | NYSE     | 15 minutes  |
| United States        | NYSE ARCA                                      | Stock Exchange | NYSE     | 15 minutes  |
| United States        | Other OTC                                      | Stock Exchange | OTC      | End of day  |
| United States        | US Mutual Funds                                | Managed Fund   | FundUS   | Daily       |

---

## What InvestaLens Doesn't Track

The following asset types are **not supported**:

- **Derivatives** — CFDs, futures, options contracts
- **Defined benefit superannuation** — only accumulation funds can be tracked (via custom investment)

---

## Net Worth & Liabilities

InvestaLens is primarily an **asset tracker**, but provides a Net Worth view that incorporates liabilities to give you a complete picture of your financial position.

### How Net Worth Works

```
Net Worth = Total Assets (all portfolios) − Total Liabilities
```

### Tracking Liabilities

Liabilities represent financial obligations that reduce your net worth. Add them via **Account > Liabilities**.

| Liability Type  | Example                               | How to Record                                          |
| --------------- | ------------------------------------- | ------------------------------------------------------ |
| Mortgage        | Home loan balance                     | Enter current outstanding balance, update periodically |
| Investment Loan | Margin loan, investment property loan | Link to portfolio for LVR tracking                     |
| Student Loan    | HECS-HELP, FEE-HELP                   | Enter balance; manual updates                          |
| Personal Loan   | Car loan, personal finance            | Enter balance and repayment schedule                   |
| Credit Card     | Outstanding balance                   | Enter current balance                                  |
| Other           | Any other financial obligation        | Free-form entry                                        |

**Liability fields:**

| Field            | Description                                                    |
| ---------------- | -------------------------------------------------------------- |
| Name             | Display name (e.g. "ANZ Home Loan")                            |
| Type             | Category from the table above                                  |
| Balance          | Current outstanding amount                                     |
| Interest Rate    | Annual interest rate (for projection)                          |
| Currency         | Currency of the liability                                      |
| Linked Portfolio | Optional — link to an investment portfolio for LVR calculation |
| Notes            | Free-text notes                                                |

### Net Worth Dashboard

The Net Worth view displays:

- **Total assets** — Sum of all portfolio values (investments + cash accounts)
- **Total liabilities** — Sum of all recorded liabilities
- **Net worth** — Assets minus liabilities
- **Net worth over time** — Historical chart showing growth trajectory
- **Asset/liability breakdown** — Pie chart showing composition
- **Loan-to-Value Ratio (LVR)** — For linked investment loans, shows current gearing level

### Updating Liabilities

Liabilities are not automatically updated (there is no bank feed integration for loan balances). Update manually:

- Edit the balance from **Account > Liabilities** at any time
- Record history to see your debt reduction over time
- Set reminders to update monthly or after each repayment

> **Note:** InvestaLens does not provide debt management advice. Liability tracking is for net worth visibility only.

---

## Related Documentation

| Document                                 | Description                                                          |
| ---------------------------------------- | -------------------------------------------------------------------- |
| [GETTING-STARTED.md](GETTING-STARTED.md) | How to add investments to your portfolio                             |
| [DATA_IMPORT.md](DATA_IMPORT.md)         | Import architecture, CSV mapping, and bond-specific import fields    |
| [TOOLS.md](TOOLS.md)                     | Reports and analysis tools for your holdings                         |
| [ACCOUNT.md](ACCOUNT.md)                 | Custom groups, labels, and portfolio organisation                    |
| [TAX.md](TAX.md)                         | Tax implications of different asset types (AMIT, stapled securities) |
| [ACTIONS.md](ACTIONS.md)                 | Corporate actions affecting your holdings (splits, mergers, rights)  |
