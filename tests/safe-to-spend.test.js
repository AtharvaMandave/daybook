import { describe, it, expect } from "vitest";
import { calculateSafeToSpend, getNextPayday } from "../lib/finance/safe-to-spend.js";

describe("Safe to Spend Calculation Engine", () => {
  const referenceDate = new Date("2026-10-15T10:00:00Z");

  const mockAccounts = [
    { id: "acc-1", name: "HDFC Salary Account", type: "checking", balance: 65000, isArchived: false },
    { id: "acc-2", name: "ICICI Savings", type: "savings", balance: 25000, isArchived: false },
    { id: "acc-3", name: "Axis Bank Credit Card", type: "credit", balance: -12000, isArchived: false }, // ₹12,000 debt
  ];

  const mockPayday = {
    isConfigured: true,
    dayOfMonth: 30, // 30th of month
    expectedPaydayIncome: 120000,
  };

  const mockBills = [
    { id: "b1", name: "House Rent", amount: 24000, nextDueDate: "2026-10-25", isPaused: false, type: "expense" },
    { id: "b2", name: "Electricity Bill", amount: 2500, nextDueDate: "2026-10-20", isPaused: false, type: "expense" },
    { id: "b3", name: "Wi-Fi Fiber", amount: 1200, nextDueDate: "2026-10-18", isPaused: false, type: "expense" },
    { id: "b4", name: "Next Month Gym", amount: 3000, nextDueDate: "2026-11-05", isPaused: false, type: "expense" }, // After payday!
  ];

  it("accurately computes next payday in the current month", () => {
    const payday = getNextPayday(mockPayday, referenceDate);
    expect(payday).not.toBeNull();
    expect(payday.getDate()).toBe(30);
    expect(payday.getMonth()).toBe(9); // 0-indexed: 9 = October
  });

  it("accurately rolls payday over to the next month if passed", () => {
    const lateDate = new Date("2026-10-31T10:00:00Z");
    const nextMonthPayday = getNextPayday(mockPayday, lateDate);
    expect(nextMonthPayday.getMonth()).toBe(10); // November
    expect(nextMonthPayday.getDate()).toBe(30);
  });

  it("handles month-end variations (e.g. 31st for 30-day month)", () => {
    const payday31 = { isConfigured: true, dayOfMonth: 31 };
    const aprDate = new Date("2026-04-10T10:00:00Z"); // April has 30 days
    const payday = getNextPayday(payday31, aprDate);
    expect(payday.getDate()).toBe(30);
  });

  it("correctly calculates safe to spend by reserving upcoming obligations and deducting credit liabilities", () => {
    const result = calculateSafeToSpend({
      accounts: mockAccounts,
      paydayConfig: mockPayday,
      recurringBills: mockBills,
      plannedSavings: [{ amount: 10000, name: "Emergency Fund" }],
      recordedTransactions: [],
      referenceDate,
    });

    // Liquid funds: 65,000 + 25,000 = 90,000
    // Credit card liability: 12,000
    // Net Available = 78,000
    // Obligations before Oct 30: Rent (24,000) + Electricity (2,500) + Wi-Fi (1,200) = 27,700
    // (Gym on Nov 5 must be excluded because it is after Oct 30)
    // Planned Savings: 10,000
    // Safe to Spend = 78,000 - 27,700 - 10,000 = 40,300
    expect(result.breakdown.liquidBalance).toBe(90000);
    expect(result.breakdown.creditCardDue).toBe(12000);
    expect(result.breakdown.netAvailableFunds).toBe(78000);
    expect(result.breakdown.upcomingObligations).toBe(27700);
    expect(result.breakdown.plannedSavings).toBe(10000);
    expect(result.safeToSpend).toBe(40300);
    expect(result.status).toBe("calculated");
    expect(result.daysUntilPayday).toBe(15);
    expect(result.dailySafeToSpend).toBe(Math.round(40300 / 15));
  });

  it("prevents double-counting if an upcoming bill was already paid as a recorded transaction", () => {
    const recordedTransactions = [
      {
        id: "tx-paid-rent",
        type: "expense",
        amount: 24000,
        description: "House Rent",
        date: "2026-10-16",
        recurringRuleId: "b1",
      },
    ];

    const result = calculateSafeToSpend({
      accounts: mockAccounts,
      paydayConfig: mockPayday,
      recurringBills: mockBills,
      plannedSavings: [],
      recordedTransactions,
      referenceDate,
    });

    // Rent was already recorded as paid, so upcoming obligations should only be Electricity (2,500) + Wi-Fi (1,200) = 3,700
    expect(result.breakdown.upcomingObligations).toBe(3700);
    // Safe to spend = 78,000 - 3,700 = 74,300
    expect(result.safeToSpend).toBe(74300);
  });

  it("handles when no payday is configured gracefully", () => {
    const result = calculateSafeToSpend({
      accounts: mockAccounts,
      paydayConfig: { isConfigured: false },
      referenceDate,
    });

    expect(result.status).toBe("no_payday_configured");
    expect(result.safeToSpend).toBe(78000);
    expect(result.daysUntilPayday).toBeNull();
  });
});
