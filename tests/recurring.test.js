import { describe, it, expect } from "vitest";
import {
  advanceDueDate,
  calculateAnnualCost,
  calculateMonthlyEquivalent,
} from "../lib/finance/recurring.js";

describe("Recurring Payments & Projections Engine", () => {
  it("advances due dates correctly by frequency", () => {
    const baseDate = new Date("2026-10-01T00:00:00Z");

    const nextWeekly = advanceDueDate(baseDate, "weekly");
    expect(nextWeekly.getDate()).toBe(8);

    const nextBiweekly = advanceDueDate(baseDate, "biweekly");
    expect(nextBiweekly.getDate()).toBe(15);

    const nextMonthly = advanceDueDate(baseDate, "monthly");
    expect(nextMonthly.getMonth()).toBe(10); // November

    const nextQuarterly = advanceDueDate(baseDate, "quarterly");
    expect(nextQuarterly.getMonth()).toBe(0); // Jan next year
    expect(nextQuarterly.getFullYear()).toBe(2027);

    const nextYearly = advanceDueDate(baseDate, "yearly");
    expect(nextYearly.getFullYear()).toBe(2027);
  });

  it("handles month-end date transitions safely (e.g. Jan 31 -> Feb)", () => {
    const jan31 = new Date(2026, 0, 31);
    const nextMonth = advanceDueDate(jan31, "monthly");
    // February 2026 has 28 days
    expect(nextMonth.getMonth()).toBe(1); // February
    expect(nextMonth.getDate()).toBe(28);
  });

  it("accurately projects annualized costs", () => {
    expect(calculateAnnualCost(1000, "monthly")).toBe(12000);
    expect(calculateAnnualCost(500, "weekly")).toBe(26000);
    expect(calculateAnnualCost(1000, "biweekly")).toBe(26000);
    expect(calculateAnnualCost(3000, "quarterly")).toBe(12000);
    expect(calculateAnnualCost(15000, "yearly")).toBe(15000);
  });

  it("accurately projects monthly equivalent costs", () => {
    expect(calculateMonthlyEquivalent(3000, "quarterly")).toBe(1000);
    expect(calculateMonthlyEquivalent(12000, "yearly")).toBe(1000);
    expect(calculateMonthlyEquivalent(2500, "monthly")).toBe(2500);
  });
});
