/**
 * Recurring Schedule Engine
 * Accurately handles recurring rules, month ends, leap years,
 * and annualized/monthly projection calculations.
 */

import { addWeeks, addMonths, addYears, parseISO, format, isAfter } from "date-fns";

export const FREQUENCY_LABELS = {
  weekly: "Weekly",
  biweekly: "Every 2 Weeks",
  monthly: "Monthly",
  quarterly: "Every 3 Months",
  yearly: "Yearly",
};

/**
 * Advance due date to the next scheduled interval, respecting month ends and leap years.
 * @param {string|Date} currentDate
 * @param {"weekly"|"biweekly"|"monthly"|"quarterly"|"yearly"} frequency
 * @returns {Date}
 */
export function advanceDueDate(currentDate, frequency) {
  const dateObj = typeof currentDate === "string" ? parseISO(currentDate) : new Date(currentDate);

  switch (frequency) {
    case "weekly":
      return addWeeks(dateObj, 1);
    case "biweekly":
      return addWeeks(dateObj, 2);
    case "monthly":
      return addMonths(dateObj, 1);
    case "quarterly":
      return addMonths(dateObj, 3);
    case "yearly":
      return addYears(dateObj, 1);
    default:
      return addMonths(dateObj, 1);
  }
}

/**
 * Calculate the estimated annualized cost of a recurring rule.
 * @param {number|string} amount
 * @param {string} frequency
 * @returns {number}
 */
export function calculateAnnualCost(amount, frequency) {
  const amt = Number(amount) || 0;
  switch (frequency) {
    case "weekly":
      return Math.round(amt * 52);
    case "biweekly":
      return Math.round(amt * 26);
    case "monthly":
      return Math.round(amt * 12);
    case "quarterly":
      return Math.round(amt * 4);
    case "yearly":
      return Math.round(amt * 1);
    default:
      return Math.round(amt * 12);
  }
}

/**
 * Calculate the normalized monthly cost for recurring obligations.
 * @param {number|string} amount
 * @param {string} frequency
 * @returns {number}
 */
export function calculateMonthlyEquivalent(amount, frequency) {
  const amt = Number(amount) || 0;
  switch (frequency) {
    case "weekly":
      return Math.round(((amt * 52) / 12) * 100) / 100;
    case "biweekly":
      return Math.round(((amt * 26) / 12) * 100) / 100;
    case "monthly":
      return Math.round(amt * 100) / 100;
    case "quarterly":
      return Math.round((amt / 3) * 100) / 100;
    case "yearly":
      return Math.round((amt / 12) * 100) / 100;
    default:
      return Math.round(amt * 100) / 100;
  }
}
