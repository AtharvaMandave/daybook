/**
 * Currency and Financial Formatting Utility
 * Default currency is INR (₹).
 * Uses Intl.NumberFormat with tabular numerals support and privacy mode masking.
 */

const CURRENCY_CONFIG = {
  INR: {
    symbol: "₹",
    locale: "en-IN",
    minorUnitMultiplier: 100, // 100 paise = 1 Rupee
  },
  USD: {
    symbol: "$",
    locale: "en-US",
    minorUnitMultiplier: 100,
  },
  EUR: {
    symbol: "€",
    locale: "de-DE",
    minorUnitMultiplier: 100,
  },
  GBP: {
    symbol: "£",
    locale: "en-GB",
    minorUnitMultiplier: 100,
  },
};

/**
 * Format an amount in INR or specified currency.
 * @param {number|string} amount
 * @param {Object} [options]
 * @param {string} [options.currency="INR"]
 * @param {boolean} [options.isPrivate=false] If true, masks value as '••••••'
 * @param {boolean} [options.showSign=false] If true, prepends + for positive
 * @param {boolean} [options.compact=false] If true, formats e.g. 1.2L or 10K
 * @returns {string} Formatted string
 */
export function formatCurrency(amount, options = {}) {
  const {
    currency = "INR",
    isPrivate = false,
    showSign = false,
    compact = false,
  } = options;

  if (isPrivate) {
    return "••••••";
  }

  const num = typeof amount === "number" ? amount : parseFloat(amount) || 0;
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.INR;

  if (compact && Math.abs(num) >= 100000 && currency === "INR") {
    // Indian Lakh / Crore notation
    if (Math.abs(num) >= 10000000) {
      const cr = (num / 10000000).toFixed(2);
      return `${showSign && num > 0 ? "+" : ""}${config.symbol}${cr} Cr`;
    }
    const lk = (num / 100000).toFixed(2);
    return `${showSign && num > 0 ? "+" : ""}${config.symbol}${lk} L`;
  }

  const formatter = new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    signDisplay: showSign ? "always" : "auto",
  });

  return formatter.format(num);
}

/**
 * Convert rupees to minor units (paise) safely to prevent floating-point inaccuracy.
 * @param {number|string} amountInRupees
 * @returns {number} Integer paise
 */
export function rupeesToPaise(amountInRupees) {
  const parsed = typeof amountInRupees === "number" ? amountInRupees : parseFloat(amountInRupees);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

/**
 * Convert paise to rupees.
 * @param {number} amountInPaise
 * @returns {number}
 */
export function paiseToRupees(amountInPaise) {
  if (!amountInPaise || isNaN(amountInPaise)) return 0;
  return amountInPaise / 100;
}

/**
 * Format transaction sign for income/expense.
 * @param {number} amount
 * @param {"expense"|"income"|"transfer"} type
 * @param {boolean} isPrivate
 * @returns {string}
 */
export function formatSignedAmount(amount, type, isPrivate = false) {
  if (isPrivate) return "••••••";
  const absAmt = Math.abs(Number(amount) || 0);
  const formatted = formatCurrency(absAmt);

  if (type === "income") {
    return `+${formatted}`;
  } else if (type === "expense") {
    return `-${formatted}`;
  }
  return formatted;
}
