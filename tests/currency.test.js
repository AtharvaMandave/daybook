import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  rupeesToPaise,
  paiseToRupees,
  formatSignedAmount,
} from "../lib/finance/currency.js";

describe("Currency & Formatting Utilities", () => {
  it("formats Indian Rupee amounts correctly with symbol and commas", () => {
    const formatted = formatCurrency(125000);
    // Should include ₹ and comma formatting
    expect(formatted).toContain("₹");
    expect(formatted).toContain("1,25,000");
  });

  it("handles privacy mode by masking amounts as '••••••'", () => {
    expect(formatCurrency(45000, { isPrivate: true })).toBe("••••••");
    expect(formatSignedAmount(12000, "expense", true)).toBe("••••••");
    expect(formatSignedAmount(85000, "income", true)).toBe("••••••");
  });

  it("formats signed amounts for expenses, incomes, and transfers", () => {
    const expense = formatSignedAmount(1500, "expense");
    const income = formatSignedAmount(50000, "income");

    expect(expense.startsWith("-")).toBe(true);
    expect(expense).toContain("1,500");

    expect(income.startsWith("+")).toBe(true);
    expect(income).toContain("50,000");
  });

  it("accurately converts rupees to paise without floating point issues", () => {
    expect(rupeesToPaise(100.5)).toBe(10050);
    expect(rupeesToPaise(19.99)).toBe(1999);
    expect(rupeesToPaise("250.75")).toBe(25075);
    expect(rupeesToPaise(0)).toBe(0);
  });

  it("accurately converts paise to rupees", () => {
    expect(paiseToRupees(10050)).toBe(100.5);
    expect(paiseToRupees(1999)).toBe(19.99);
    expect(paiseToRupees(0)).toBe(0);
  });

  it("handles compact Indian notations for Lakhs and Crores", () => {
    const lakh = formatCurrency(250000, { compact: true });
    expect(lakh).toContain("2.50 L");

    const crore = formatCurrency(15000000, { compact: true });
    expect(crore).toContain("1.50 Cr");
  });
});
