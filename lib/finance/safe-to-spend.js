/**
 * Safe to Spend Calculation Engine
 * 
 * Pure, testable financial calculation module independent of UI/browser rendering.
 * Estimates how much the user can safely spend between today and their next configured payday.
 */

import { differenceInCalendarDays, parseISO, isAfter, isBefore, isEqual, addMonths, setDate } from "date-fns";

/**
 * Determine the next payday date string (YYYY-MM-DD) based on user's payday configuration.
 * @param {Object} paydayConfig e.g. { dayOfMonth: 28, isConfigured: true }
 * @param {Date} referenceDate default today
 * @returns {Date|null}
 */
export function getNextPayday(paydayConfig, referenceDate = new Date()) {
  if (!paydayConfig || !paydayConfig.isConfigured || !paydayConfig.dayOfMonth) {
    return null;
  }

  const targetDay = parseInt(paydayConfig.dayOfMonth, 10);
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth();
  const refDay = referenceDate.getDate();

  // Days in current month
  const daysInCurrentMonth = new Date(refYear, refMonth + 1, 0).getDate();
  const actualTargetThisMonth = Math.min(targetDay, daysInCurrentMonth);

  if (refDay < actualTargetThisMonth) {
    return new Date(refYear, refMonth, actualTargetThisMonth);
  } else {
    // Moves to next month
    const nextMonthDate = addMonths(referenceDate, 1);
    const daysInNextMonth = new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth() + 1, 0).getDate();
    const actualTargetNextMonth = Math.min(targetDay, daysInNextMonth);
    return new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), actualTargetNextMonth);
  }
}

/**
 * Calculate Safe to Spend amount and breakdown.
 * 
 * @param {Object} params
 * @param {Array} params.accounts List of account objects { id, name, type, balance, includeInNetWorth, isArchived }
 * @param {Object} params.paydayConfig { isConfigured, dayOfMonth, expectedPaydayIncome }
 * @param {Array} params.recurringBills List of recurring rule items due between today and next payday
 * @param {Array} params.plannedSavings List of planned savings allocations before payday
 * @param {Array} params.recordedTransactions Recent recorded transactions to prevent duplicate obligations
 * @param {Date} [params.referenceDate] Current date (defaults to new Date())
 * 
 * @returns {Object} Result breakdown
 */
export function calculateSafeToSpend({
  accounts = [],
  paydayConfig = { isConfigured: false, dayOfMonth: null, expectedPaydayIncome: 0 },
  recurringBills = [],
  plannedSavings = [],
  recordedTransactions = [],
  referenceDate = new Date(),
}) {
  const assumptions = [];
  const activeAccounts = accounts.filter((a) => !a.isArchived);

  // 1. Calculate Liquid Balances (Bank Accounts, Savings, Current, Cash, Digital Wallets)
  // Credit cards are treated as liabilities.
  const liquidAccounts = activeAccounts.filter(
    (a) => ["checking", "savings", "cash", "wallet"].includes(a.type?.toLowerCase())
  );
  const liquidBalance = liquidAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

  // 2. Calculate Credit Card liability due
  // For credit cards, negative balance or outstanding balance represents owed liability
  const creditAccounts = activeAccounts.filter((a) => a.type?.toLowerCase() === "credit");
  const creditCardLiability = creditAccounts.reduce((sum, a) => {
    const bal = Number(a.balance) || 0;
    // In our convention: positive balance on credit card is debt owed (or negative if conventional).
    // If balance is < 0, it means user owes money. We normalize to positive liability.
    return sum + (bal < 0 ? Math.abs(bal) : 0);
  }, 0);

  const netAvailableFunds = Math.max(0, liquidBalance - creditCardLiability);

  assumptions.push(
    `Included ${liquidAccounts.length} liquid account(s) totaling ₹${liquidBalance.toLocaleString("en-IN")}.`
  );
  if (creditCardLiability > 0) {
    assumptions.push(
      `Deducted ₹${creditCardLiability.toLocaleString("en-IN")} in outstanding credit liabilities.`
    );
  }

  // 3. Evaluate Next Payday
  const nextPayday = getNextPayday(paydayConfig, referenceDate);
  if (!nextPayday) {
    return {
      status: "no_payday_configured",
      safeToSpend: netAvailableFunds,
      dailySafeToSpend: null,
      daysUntilPayday: null,
      nextPayday: null,
      breakdown: {
        liquidBalance,
        creditCardDue: creditCardLiability,
        netAvailableFunds,
        expectedIncome: 0,
        upcomingObligations: 0,
        plannedSavings: 0,
      },
      assumptions: [
        ...assumptions,
        "No payday configured. Safe to spend reflects current net liquid balance without time-horizon deductions.",
      ],
      upcomingItems: [],
    };
  }

  const daysUntilPayday = Math.max(1, differenceInCalendarDays(nextPayday, referenceDate));

  // 4. Calculate Upcoming Obligations before next payday
  // Filter out any bill that has already been recorded as a transaction between last cycle and now
  // to avoid double counting!
  const refDateOnly = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const paydayDateOnly = new Date(nextPayday.getFullYear(), nextPayday.getMonth(), nextPayday.getDate());

  const upcomingItems = [];
  let totalUpcomingObligations = 0;

  for (const bill of recurringBills) {
    if (bill.isPaused || bill.status === "cancelled" || bill.type === "income") continue;

    const dueDate = typeof bill.nextDueDate === "string" ? parseISO(bill.nextDueDate) : new Date(bill.nextDueDate);
    const billDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

    // Check if within horizon: today <= dueDate <= nextPayday
    if (billDateOnly >= refDateOnly && billDateOnly <= paydayDateOnly) {
      // Check if already paid: does recordedTransactions have an expense for this recurring item?
      const alreadyPaid = recordedTransactions.some((t) => {
        if (t.type !== "expense") return false;
        if (t.recurringRuleId && t.recurringRuleId === bill.id) return true;
        // Or same description and similar amount within 7 days
        const txDate = typeof t.date === "string" ? parseISO(t.date) : new Date(t.date);
        const matchName = t.description?.toLowerCase().trim() === bill.name?.toLowerCase().trim();
        const diff = Math.abs(differenceInCalendarDays(txDate, billDateOnly));
        return matchName && diff <= 5 && Math.abs(Number(t.amount) - Number(bill.amount)) < 1;
      });

      if (!alreadyPaid) {
        const amt = Number(bill.amount) || 0;
        totalUpcomingObligations += amt;
        upcomingItems.push({
          id: bill.id,
          title: bill.name,
          amount: amt,
          dueDate: bill.nextDueDate,
          category: bill.category || "Bills & Utilities",
        });
      }
    }
  }

  // 5. Planned Savings commitments before payday
  const totalPlannedSavings = plannedSavings.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  // 6. Expected Income before payday (only if explicitly scheduled BEFORE or ON payday)
  // If income is on payday itself, it fuels the NEXT cycle, so we do not count payday salary
  // as money you can spend BEFORE getting paid!
  let expectedInterimIncome = 0;
  for (const item of recurringBills) {
    if (item.type === "income" && !item.isPaused) {
      const dueDate = typeof item.nextDueDate === "string" ? parseISO(item.nextDueDate) : new Date(item.nextDueDate);
      const incomeDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      // Only count if it arrives strictly BEFORE next payday to be spendable in this cycle
      if (incomeDateOnly >= refDateOnly && incomeDateOnly < paydayDateOnly) {
        expectedInterimIncome += Number(item.amount) || 0;
      }
    }
  }

  // 7. Calculate Safe to Spend
  // Safe to Spend = Net Available + Interim Expected Income - Upcoming Obligations - Planned Savings
  const rawSafeToSpend = netAvailableFunds + expectedInterimIncome - totalUpcomingObligations - totalPlannedSavings;
  const safeToSpend = Math.max(0, rawSafeToSpend);
  const dailySafeToSpend = Math.round(safeToSpend / daysUntilPayday);

  assumptions.push(`Next payday is in ${daysUntilPayday} day(s) on ${nextPayday.toISOString().split("T")[0]}.`);
  assumptions.push(`Reserved ₹${totalUpcomingObligations.toLocaleString("en-IN")} for ${upcomingItems.length} upcoming bill(s).`);
  if (totalPlannedSavings > 0) {
    assumptions.push(`Committed ₹${totalPlannedSavings.toLocaleString("en-IN")} towards planned savings.`);
  }
  if (expectedInterimIncome > 0) {
    assumptions.push(`Included ₹${expectedInterimIncome.toLocaleString("en-IN")} in anticipated interim income.`);
  }

  return {
    status: rawSafeToSpend < 0 ? "deficit" : "calculated",
    rawSafeToSpend,
    safeToSpend,
    dailySafeToSpend,
    daysUntilPayday,
    nextPayday: nextPayday.toISOString().split("T")[0],
    breakdown: {
      liquidBalance,
      creditCardDue: creditCardLiability,
      netAvailableFunds,
      expectedIncome: expectedInterimIncome,
      upcomingObligations: totalUpcomingObligations,
      plannedSavings: totalPlannedSavings,
    },
    assumptions,
    upcomingItems,
  };
}
