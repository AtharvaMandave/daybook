/**
 * Financial Calculation Core
 * 
 * Accurately calculates account balances, monthly income/expense totals,
 * transfers (which must NEVER count as income or expense), split allocations,
 * and budget utilization.
 */

import { parseISO, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";

/**
 * Validate that split allocations equal the total transaction amount.
 * @param {number|string} totalAmount
 * @param {Array<{ amount: number|string, category: string }>} splits
 * @returns {{ isValid: boolean, diff: number, message?: string }}
 */
export function validateSplitAllocations(totalAmount, splits = []) {
  const total = Math.round(Number(totalAmount) * 100);
  if (!splits || splits.length === 0) {
    return { isValid: false, diff: total / 100, message: "At least one split allocation is required." };
  }

  const splitSum = splits.reduce((sum, item) => sum + Math.round((Number(item.amount) || 0) * 100), 0);
  const diff = (total - splitSum) / 100;

  if (Math.abs(diff) > 0.001) {
    return {
      isValid: false,
      diff,
      message: `Split total (₹${(splitSum / 100).toFixed(2)}) must equal transaction amount (₹${(total / 100).toFixed(2)}). Difference: ₹${diff.toFixed(2)}.`,
    };
  }

  return { isValid: true, diff: 0 };
}

/**
 * Calculate dynamic account balance based on opening balance and transactions.
 * Accounting convention:
 * - Bank/Cash/Wallet:
 *    balance = openingBalance + sum(income) - sum(expense) + sum(transferIn) - sum(transferOut)
 * - Credit Card:
 *    Represents liability. In our unified net worth balance convention:
 *    balance = openingBalance - sum(expense) + sum(payments/transferIn)
 *    (A negative balance indicates debt owed).
 * 
 * @param {Object} account
 * @param {Array} transactions
 * @returns {number} Updated balance
 */
export function calculateAccountBalance(account, transactions = []) {
  if (!account) return 0;
  let balance = Number(account.openingBalance) || 0;
  const isCredit = account.type?.toLowerCase() === "credit";

  for (const t of transactions) {
    const amt = Number(t.amount) || 0;

    if (t.type === "expense" && t.accountId === account.id) {
      balance -= amt;
    } else if (t.type === "income" && t.accountId === account.id) {
      balance += amt;
    } else if (t.type === "transfer") {
      // Source account loses money
      if (t.fromAccountId === account.id || t.accountId === account.id) {
        balance -= amt;
      }
      // Destination account receives money
      if (t.toAccountId === account.id) {
        balance += amt;
      }
    }
  }

  return Math.round(balance * 100) / 100;
}

/**
 * Compute total net worth across all active accounts included in net worth.
 * @param {Array} accounts
 * @returns {{ totalNetWorth: number, liquidBalance: number, totalDebt: number }}
 */
export function calculateNetWorth(accounts = []) {
  let liquidBalance = 0;
  let totalDebt = 0;

  for (const acc of accounts) {
    if (acc.isArchived) continue;
    const bal = Number(acc.balance) || 0;
    if (acc.type?.toLowerCase() === "credit") {
      if (bal < 0) {
        totalDebt += Math.abs(bal);
      }
    } else {
      if (bal > 0) {
        liquidBalance += bal;
      } else {
        totalDebt += Math.abs(bal);
      }
    }
  }

  return {
    totalNetWorth: liquidBalance - totalDebt,
    liquidBalance,
    totalDebt,
  };
}

/**
 * Compute period financial totals (Income, Expense, Net Flow, Savings Rate).
 * STRICT RULE: Transfers are completely excluded from income and expenses!
 * 
 * @param {Array} transactions
 * @param {Date} [periodStart]
 * @param {Date} [periodEnd]
 * @returns {Object}
 */
export function calculatePeriodTotals(transactions = [], periodStart = null, periodEnd = null) {
  let totalIncome = 0;
  let totalExpense = 0;
  let transferVolume = 0;
  let transactionCount = 0;

  for (const t of transactions) {
    if (periodStart && periodEnd) {
      const tDate = typeof t.date === "string" ? parseISO(t.date) : new Date(t.date);
      if (!isWithinInterval(tDate, { start: periodStart, end: periodEnd })) {
        continue;
      }
    }

    const amt = Number(t.amount) || 0;
    transactionCount++;

    if (t.type === "expense") {
      totalExpense += amt;
    } else if (t.type === "income") {
      totalIncome += amt;
    } else if (t.type === "transfer") {
      transferVolume += amt;
    }
  }

  const netCashFlow = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round(((totalIncome - totalExpense) / totalIncome) * 100)) : 0;

  return {
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpense: Math.round(totalExpense * 100) / 100,
    netCashFlow: Math.round(netCashFlow * 100) / 100,
    transferVolume: Math.round(transferVolume * 100) / 100,
    savingsRate,
    transactionCount,
  };
}

/**
 * Break down expenses by category for a period.
 * Accurately processes split transactions without double-counting!
 * 
 * @param {Array} transactions
 * @param {Date} [periodStart]
 * @param {Date} [periodEnd]
 * @returns {Array<{ category: string, total: number, percentage: number, count: number }>}
 */
export function calculateCategoryBreakdown(transactions = [], periodStart = null, periodEnd = null) {
  const categoryMap = {};
  let overallExpense = 0;

  for (const t of transactions) {
    if (t.type !== "expense") continue;

    if (periodStart && periodEnd) {
      const tDate = typeof t.date === "string" ? parseISO(t.date) : new Date(t.date);
      if (!isWithinInterval(tDate, { start: periodStart, end: periodEnd })) {
        continue;
      }
    }

    // Check for split transactions
    if (t.isSplit && Array.isArray(t.splits) && t.splits.length > 0) {
      for (const split of t.splits) {
        const cat = split.category || "Uncategorized";
        const amt = Number(split.amount) || 0;
        if (!categoryMap[cat]) {
          categoryMap[cat] = { category: cat, total: 0, count: 0 };
        }
        categoryMap[cat].total += amt;
        categoryMap[cat].count += 1;
        overallExpense += amt;
      }
    } else {
      const cat = t.category || "Uncategorized";
      const amt = Number(t.amount) || 0;
      if (!categoryMap[cat]) {
        categoryMap[cat] = { category: cat, total: 0, count: 0 };
      }
      categoryMap[cat].total += amt;
      categoryMap[cat].count += 1;
      overallExpense += amt;
    }
  }

  const result = Object.values(categoryMap).map((item) => ({
    ...item,
    total: Math.round(item.total * 100) / 100,
    percentage: overallExpense > 0 ? Math.round((item.total / overallExpense) * 100) : 0,
  }));

  // Sort descending by amount spent
  return result.sort((a, b) => b.total - a.total);
}

/**
 * Calculate budget status for each configured budget.
 * 
 * @param {Array} budgets List of { id, category, limit, period, rolloverAmount }
 * @param {Array} transactions
 * @param {Date} periodStart
 * @param {Date} periodEnd
 * @returns {Array} List of budgets with spent, remaining, percentage, status
 */
export function calculateBudgetsProgress(budgets = [], transactions = [], periodStart = null, periodEnd = null) {
  const categorySpending = {};

  for (const t of transactions) {
    if (t.type !== "expense") continue;

    if (periodStart && periodEnd) {
      const tDate = typeof t.date === "string" ? parseISO(t.date) : new Date(t.date);
      if (!isWithinInterval(tDate, { start: periodStart, end: periodEnd })) {
        continue;
      }
    }

    if (t.isSplit && Array.isArray(t.splits) && t.splits.length > 0) {
      for (const split of t.splits) {
        const cat = (split.category || "Uncategorized").toLowerCase();
        categorySpending[cat] = (categorySpending[cat] || 0) + (Number(split.amount) || 0);
      }
    } else {
      const cat = (t.category || "Uncategorized").toLowerCase();
      categorySpending[cat] = (categorySpending[cat] || 0) + (Number(t.amount) || 0);
    }
  }

  return budgets.map((b) => {
    const catKey = (b.category || "").toLowerCase();
    const spent = Math.round((categorySpending[catKey] || 0) * 100) / 100;
    const baseLimit = Number(b.limit) || 0;
    const rollover = Number(b.rolloverAmount) || 0;
    const effectiveLimit = baseLimit + rollover;
    const remaining = Math.max(0, effectiveLimit - spent);
    const percentage = effectiveLimit > 0 ? Math.round((spent / effectiveLimit) * 100) : 0;

    let status = "normal"; // safe
    if (spent >= effectiveLimit) {
      status = "exceeded";
    } else if (percentage >= 80) {
      status = "warning";
    }

    return {
      ...b,
      spent,
      effectiveLimit,
      remaining,
      percentage,
      status,
      isOverBudget: spent > effectiveLimit,
      overAmount: spent > effectiveLimit ? Math.round((spent - effectiveLimit) * 100) / 100 : 0,
    };
  });
}
