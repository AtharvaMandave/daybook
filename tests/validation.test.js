import { describe, it, expect } from "vitest";
import {
  transactionSchema,
  accountSchema,
  budgetSchema,
  recurringRuleSchema,
} from "../lib/validation/schemas.js";

describe("Validation Schemas & Accounting Rules", () => {
  it("validates a standard expense transaction", () => {
    const validExpense = {
      amount: 450,
      type: "expense",
      description: "Coffee & Pastry",
      date: "2026-10-15",
      category: "Food & Dining",
      accountId: "acc-1",
      paymentMethod: "UPI",
    };

    const result = transactionSchema.safeParse(validExpense);
    expect(result.success).toBe(true);
  });

  it("fails when an expense is missing account or category", () => {
    const missingCategory = {
      amount: 450,
      type: "expense",
      description: "Coffee",
      date: "2026-10-15",
      accountId: "acc-1",
    };

    const result = transactionSchema.safeParse(missingCategory);
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((i) => i.path.includes("category"))).toBe(true);
  });

  it("validates transfers and requires distinct source and destination accounts", () => {
    const validTransfer = {
      amount: 5000,
      type: "transfer",
      description: "Transfer to Savings",
      date: "2026-10-15",
      fromAccountId: "acc-1",
      toAccountId: "acc-2",
    };

    const invalidTransferSameAccount = {
      amount: 5000,
      type: "transfer",
      description: "Self Transfer",
      date: "2026-10-15",
      fromAccountId: "acc-1",
      toAccountId: "acc-1",
    };

    expect(transactionSchema.safeParse(validTransfer).success).toBe(true);

    const sameAccResult = transactionSchema.safeParse(invalidTransferSameAccount);
    expect(sameAccResult.success).toBe(false);
    expect(sameAccResult.error?.issues.some((i) => i.message.includes("must be different"))).toBe(true);
  });

  it("enforces split transaction allocations summing up exactly to total amount", () => {
    const validSplit = {
      amount: 2000,
      type: "expense",
      description: "Department Store",
      date: "2026-10-15",
      accountId: "acc-1",
      isSplit: true,
      splits: [
        { amount: 1500, category: "Groceries" },
        { amount: 500, category: "Household Supplies" },
      ],
    };

    const invalidSplitSumMismatch = {
      amount: 2000,
      type: "expense",
      description: "Department Store",
      date: "2026-10-15",
      accountId: "acc-1",
      isSplit: true,
      splits: [
        { amount: 1200, category: "Groceries" },
        { amount: 500, category: "Household Supplies" }, // ₹300 short
      ],
    };

    expect(transactionSchema.safeParse(validSplit).success).toBe(true);

    const invalidResult = transactionSchema.safeParse(invalidSplitSumMismatch);
    expect(invalidResult.success).toBe(false);
    expect(invalidResult.error?.issues.some((i) => i.message.includes("Split sum"))).toBe(true);
  });

  it("validates account schema fields", () => {
    const validAcc = {
      name: "HDFC Salary Account",
      type: "checking",
      openingBalance: 50000,
    };
    expect(accountSchema.safeParse(validAcc).success).toBe(true);

    const invalidAcc = {
      name: "",
      type: "invalid_type",
    };
    expect(accountSchema.safeParse(invalidAcc).success).toBe(false);
  });

  it("validates budget schema limits and warning thresholds", () => {
    const validBudget = {
      category: "Groceries",
      limit: 15000,
      period: "monthly",
      warningThreshold: 85,
    };
    expect(budgetSchema.safeParse(validBudget).success).toBe(true);

    const invalidBudget = {
      category: "Groceries",
      limit: -500, // Negative limit
    };
    expect(budgetSchema.safeParse(invalidBudget).success).toBe(false);
  });
});
