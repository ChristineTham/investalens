import type {
  ImportConfig,
  ImportTemplate,
  ImportCategory,
  CashImportConfig,
} from "./types";

export const brokerTemplates: Record<string, ImportConfig> = {
  commsec: {
    mapping: {
      tradeDate: "Trade Date",
      instrumentCode: "Security",
      quantity: "Units",
      price: "Average Price ($)",
      transactionType: "Buy/ Sell",
      brokerage: "Brokerage (inc GST.)",
      marketCode: null,
      comments: "Confirmation Number",
    },
    dateFormat: "dd/mm/yyyy",
    decimalSeparator: ".",
    transactionTypeMap: { B: "BUY", S: "SELL" },
  },
  selfwealth: {
    mapping: {
      tradeDate: "Trade Date",
      instrumentCode: "Stock",
      quantity: "Quantity",
      price: "Price",
      transactionType: "Side",
      brokerage: "Brokerage (inc GST)",
      marketCode: "Market",
      comments: "Notes",
    },
    dateFormat: "dd/mm/yyyy",
    decimalSeparator: ".",
    transactionTypeMap: { Buy: "BUY", Sell: "SELL" },
  },
  stake: {
    mapping: {
      tradeDate: "Date",
      instrumentCode: "Symbol",
      quantity: "Shares",
      price: "Price Per Share",
      transactionType: "Action",
      brokerage: "Fees",
      currency: "Currency",
      marketCode: null,
    },
    dateFormat: "yyyy-mm-dd",
    decimalSeparator: ".",
    transactionTypeMap: {
      "Market Buy": "BUY",
      "Market Sell": "SELL",
      "Limit Buy": "BUY",
      "Limit Sell": "SELL",
      Dividend: "DIVIDEND",
    },
  },
  cmc_markets: {
    mapping: {
      tradeDate: "Date/Time",
      instrumentCode: "Product",
      quantity: "Quantity",
      price: "Price",
      transactionType: "Type",
      brokerage: "Commission",
      marketCode: "Exchange",
      comments: "Reference",
    },
    dateFormat: "dd/mm/yyyy",
    decimalSeparator: ".",
    transactionTypeMap: { Buy: "BUY", Sell: "SELL" },
  },
  cmc_invest: {
    mapping: {
      tradeDate: "Trade Date",
      instrumentCode: "AsxCode",
      quantity: "Quantity",
      price: "Price",
      transactionType: "Order Type",
      brokerage: "Brokerage",
      marketCode: null,
      comments: "Confirmation Number",
    },
    dateFormat: "yyyy-mm-dd",
    decimalSeparator: ".",
    transactionTypeMap: { Buy: "BUY", Sell: "SELL" },
  },
  bell_direct: {
    mapping: {
      tradeDate: "Date Completed",
      instrumentCode: "Stock Code",
      quantity: "Quantity",
      price: "Average Transacted Price",
      transactionType: "Buy/Sell",
      brokerage: "Brokerage",
      marketCode: null,
      comments: "Contract",
    },
    dateFormat: "dd mmm yyyy hh:mm",
    decimalSeparator: ".",
    transactionTypeMap: { Buy: "BUY", Sell: "SELL" },
  },
  nabtrade: {
    mapping: {
      tradeDate: "Trade Date",
      instrumentCode: "ASX Code",
      quantity: "Units",
      price: "Price",
      transactionType: "Buy/Sell",
      brokerage: "Brokerage ($)",
      marketCode: null,
      comments: "Description",
    },
    dateFormat: "dd/mm/yyyy",
    decimalSeparator: ".",
    transactionTypeMap: { Buy: "BUY", Sell: "SELL" },
  },
  fiig: {
    mapping: {
      tradeDate: "Settlement Date",
      instrumentCode: "ISIN",
      quantity: "Face Value",
      price: "Clean Price",
      transactionType: "Trade Type",
      brokerage: "Fee",
      marketCode: null,
      currency: "Currency",
      comments: "Issuer",
      couponRate: "Coupon",
      maturityDate: "Maturity",
      faceValue: "Face Value",
      paymentFrequency: "Frequency",
    },
    dateFormat: "dd/mm/yyyy",
    decimalSeparator: ".",
    transactionTypeMap: { Buy: "BUY", Sell: "SELL", Maturity: "MATURITY" },
  },
  interactive_brokers: {
    mapping: {
      tradeDate: "Date/Time",
      instrumentCode: "Symbol",
      quantity: "Quantity",
      price: "T. Price",
      transactionType: "Code",
      brokerage: "Comm/Fee",
      currency: "Currency",
      exchangeRate: "Forex",
      marketCode: "Exchange",
      comments: "Description",
    },
    dateFormat: "yyyy-mm-dd",
    decimalSeparator: ".",
    transactionTypeMap: {
      O: "BUY",
      C: "SELL",
      BOT: "BUY",
      SLD: "SELL",
    },
  },
};

export function getBrokerTemplate(broker: string): ImportConfig | null {
  return brokerTemplates[broker] || null;
}

// ─── Cash / bank statement templates ──────────────────────────────────────────

export const cashTemplates: Record<string, CashImportConfig> = {
  // Generic "signed amount" bank statement (one Amount column, +in / -out)
  generic_bank: {
    mapping: {
      date: "Date",
      amount: "Amount",
      description: "Description",
      type: null,
    },
    dateFormat: "dd/mm/yyyy",
    decimalSeparator: ".",
  },
  // Generic statement with separate Debit / Credit columns
  generic_debit_credit: {
    mapping: {
      date: "Date",
      debit: "Debit",
      credit: "Credit",
      description: "Description",
      type: null,
    },
    dateFormat: "dd/mm/yyyy",
    decimalSeparator: ".",
  },
  // ── Australian banks ──────────────────────────────────────────────────────
  commbank: {
    mapping: { date: "Date", amount: "Amount", description: "Description", type: null },
    dateFormat: "dd/mm/yyyy",
    decimalSeparator: ".",
  },
  nab: {
    mapping: {
      date: "Date",
      amount: "Amount",
      type: "Transaction Type",
      description: "Transaction Details",
    },
    dateFormat: "dd/mm/yyyy",
    decimalSeparator: ".",
  },
  anz: {
    mapping: { date: "Date", amount: "Amount", description: "Description", type: null },
    dateFormat: "dd/mm/yyyy",
    decimalSeparator: ".",
  },
  westpac: {
    mapping: {
      date: "Effective Date",
      debit: "Debit Amount",
      credit: "Credit Amount",
      description: "Narrative",
      type: null,
    },
    dateFormat: "dd/mm/yyyy",
    decimalSeparator: ".",
  },
  ing: {
    mapping: {
      date: "Date",
      debit: "Debit",
      credit: "Credit",
      description: "Description",
      type: null,
    },
    dateFormat: "dd/mm/yyyy",
    decimalSeparator: ".",
  },
  macquarie: {
    mapping: {
      date: "Date",
      debit: "Debit",
      credit: "Credit",
      description: "Description",
      type: null,
    },
    dateFormat: "dd/mm/yyyy",
    decimalSeparator: ".",
  },
};

// ─── Template registry (metadata-driven) ─────────────────────────────────────

export const importTemplates: ImportTemplate[] = [
  // Share / equity broker statements
  {
    id: "commsec",
    name: "CommSec",
    category: "transactions",
    config: brokerTemplates.commsec,
    quickImport: true,
    description: "CommSec trade confirmation export",
  },
  {
    id: "selfwealth",
    name: "SelfWealth",
    category: "transactions",
    config: brokerTemplates.selfwealth,
    quickImport: true,
    description: "SelfWealth trade history export",
  },
  {
    id: "stake",
    name: "Stake",
    category: "transactions",
    config: brokerTemplates.stake,
    quickImport: true,
    description: "Stake transaction history",
  },
  {
    id: "cmc_invest",
    name: "CMC Invest",
    category: "transactions",
    config: brokerTemplates.cmc_invest,
    quickImport: true,
    description: "CMC Invest trade confirmations",
  },
  {
    id: "cmc_markets",
    name: "CMC Markets",
    category: "transactions",
    config: brokerTemplates.cmc_markets,
    description: "CMC Markets transaction export",
  },
  {
    id: "bell_direct",
    name: "Bell Direct",
    category: "transactions",
    config: brokerTemplates.bell_direct,
    description: "Bell Direct contract notes",
  },
  {
    id: "nabtrade",
    name: "nabtrade",
    category: "transactions",
    config: brokerTemplates.nabtrade,
    quickImport: true,
    description: "nabtrade transaction export",
  },
  {
    id: "interactive_brokers",
    name: "Interactive Brokers",
    category: "transactions",
    config: brokerTemplates.interactive_brokers,
    description: "IBKR Flex / activity statement",
  },
  // Bond / fixed-interest statements
  {
    id: "fiig",
    name: "FIIG Securities",
    category: "bonds",
    config: brokerTemplates.fiig,
    quickImport: true,
    description: "FIIG bond trade confirmations",
  },
  // Cash / bank statements
  {
    id: "generic_bank",
    name: "Bank Statement (signed amount)",
    category: "cash",
    cashConfig: cashTemplates.generic_bank,
    description: "Single Amount column (+ deposits / − withdrawals)",
  },
  {
    id: "generic_debit_credit",
    name: "Bank Statement (debit / credit)",
    category: "cash",
    cashConfig: cashTemplates.generic_debit_credit,
    description: "Separate Debit and Credit columns",
  },
  {
    id: "commbank",
    name: "CommBank",
    category: "cash",
    cashConfig: cashTemplates.commbank,
    quickImport: true,
    description: "CommBank CSV export (Date, Amount, Description)",
  },
  {
    id: "nab",
    name: "NAB",
    category: "cash",
    cashConfig: cashTemplates.nab,
    quickImport: true,
    description: "NAB transaction export",
  },
  {
    id: "anz",
    name: "ANZ",
    category: "cash",
    cashConfig: cashTemplates.anz,
    quickImport: true,
    description: "ANZ CSV export",
  },
  {
    id: "westpac",
    name: "Westpac",
    category: "cash",
    cashConfig: cashTemplates.westpac,
    quickImport: true,
    description: "Westpac CSV (Debit/Credit columns)",
  },
  {
    id: "ing",
    name: "ING",
    category: "cash",
    cashConfig: cashTemplates.ing,
    description: "ING CSV export",
  },
  {
    id: "macquarie",
    name: "Macquarie",
    category: "cash",
    cashConfig: cashTemplates.macquarie,
    description: "Macquarie CSV export",
  },
];

/** Look up a template by id across all categories. */
export function getTemplate(id: string): ImportTemplate | null {
  return importTemplates.find((t) => t.id === id) || null;
}

/** List templates filtered by category. */
export function listTemplatesByCategory(
  category: ImportCategory
): ImportTemplate[] {
  return importTemplates.filter((t) => t.category === category);
}

/** Templates that support one-step ("quick") import. */
export function listQuickImportTemplates(): ImportTemplate[] {
  return importTemplates.filter((t) => t.quickImport);
}

/** Get the cash config for a cash template id. */
export function getCashTemplate(id: string): CashImportConfig | null {
  const t = getTemplate(id);
  return t?.cashConfig || cashTemplates[id] || null;
}

/** Backwards-compatible flat list of transaction/bond broker templates. */
export function listBrokerTemplates(): Array<{ id: string; name: string }> {
  return importTemplates
    .filter((t) => t.category !== "cash")
    .map((t) => ({ id: t.id, name: t.name }));
}

