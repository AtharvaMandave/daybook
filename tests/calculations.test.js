import { describe, it, expect } from "vitest";
import {
  calculateAccountBalance,
  calculatePeriodTotals,
  validateSplitAllocations,
  calculateCategoryBreakdown,
  calculateBudgetsProgress,
} from "../lib/finance/calculations.js";

describe("Financial Calculations & Accounting Engine", () => {
  const sampleAccount = {
    id: "acc-bank",
    name: "Savings Account",
    type: "savings",
    openingBalance: 50000,
  };

  it("updates account balance correctly when adding expense and income", () => {
    const transactions = [
      { id: "t1", type: "expense", amount: 250, accountId: "acc-bank" },
      { id: "t2", type: "income", amount: 1500, accountId: "acc-bank" },
    ];

    const balance = calculateAccountBalance(sampleAccount, transactions);
    // 50,000 - 250 + 1,500 = 51,250
    expect(balance).toBe(51250);
  });

  it("ensures transfers NEVER count toward income or expense totals", () => {
    const transactions = [
      { id: "t1", type: "income", amount: 75000 },
      { id: "t2", type: "expense", amount: 12000 },
      { id: "t3", type: "transfer", amount: 20000, fromAccountId: "acc-bank", toAccountId: "acc-credit" },
    ];

    const totals = calculatePeriodTotals(transactions);
    expect(totals.totalIncome).toBe(75000);
    expect(totals.totalExpense).toBe(12000);
    expect(totals.netCashFlow).toBe(63000); // 75,000 - 12,000 = 63,000
    expect(totals.transferVolume).toBe(20000);
  });

  it("validates split transactions sum exactly to the transaction total", () => {
    const totalAmount = 1500;
    const validSplits = [
      { amount: 1000, category: "Groceries" },
      { amount: 500, category: "Household" },
    ];
    const invalidSplits = [
      { amount: 1000, category: "Groceries" },
      { amount: 400, category: "Household" }, // ₹100 short
    ];

    expect(validateSplitAllocations(totalAmount, validSplits).isValid).toBe(true);
    expect(validateSplitAllocations(totalAmount, invalidSplits).isValid).toBe(false);
  });

  it("accurately allocates split expenses without double-counting in category breakdowns", () => {
    const transactions = [
      {
        id: "t1",
        type: "expense",
        amount: 2500,
        isSplit: true,
        splits: [
          { amount: 2000, category: "Groceries" },
          { amount: 500, category: "Personal Care" },
        ],
      },
      {
        id: "t2",
        type: "expense",
        amount: 1500,
        category: "Groceries",
      },
    ];

    const breakdown = calculateCategoryBreakdown(transactions);
    const groceries = breakdown.find((b) => b.category === "Groceries");
    const personalCare = breakdown.find((b) => b.category === "Personal Care");

    // Groceries should have 2,000 (split) + 1,500 (standard) = 3,500
    expect(groceries.total).toBe(3500);
    // Personal Care should have 500
    expect(personalCare.total).toBe(500);
    // Total expenses should sum to 4,000 (no double counting of the 2,500 original transaction)
    const grandTotal = breakdown.reduce((sum, b) => sum + b.total, 0);
    expect(grandTotal).toBe(4000);
  });

  it("calculates budget usage, warning status, and remaining amount", () => {
    const budgets = [
      { id: "b1", category: "Dining", limit: 6000, rolloverAmount: 0 },
      { id: "b2", category: "Shopping", limit: 10000, rolloverAmount: 0 },
      { id: "b3", category: "Utilities", limit: 3000, rolloverAmount: 500 }, // 3,500 effective
    ];

    const transactions = [
      { type: "expense", amount: 5000, category: "Dining" }, // 5000 / 6000 = 83.3% -> warning
      { type: "expense", amount: 11000, category: "Shopping" }, // 11000 / 10000 -> exceeded
      { type: "expense", amount: 2000, category: "Utilities" }, // 2000 / 3500 -> normal
    ];

    const progress = calculateBudgetsProgress(budgets, transactions);
    const dining = progress.find((p) => p.category === "Dining");
    const shopping = progress.find((p) => p.category === "Shopping");
    const utilities = progress.find((p) => p.category === "Utilities");

    expect(dining.status).toBe("warning");
    expect(dining.remaining).toBe(1000);

    expect(shopping.status).toBe("exceeded");
    expect(shopping.isOverBudget).toBe(true);
    expect(shopping.overAmount).toBe(1000);

    expect(utilities.effectiveLimit).toBe(3500);
    expect(utilities.status).toBe("normal");
    expect(utilities.remaining).toBe(1500);
  });
});
