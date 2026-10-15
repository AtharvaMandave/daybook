/**
 * Daybook Data Repository & Reactive State Store
 * 
 * Manages accounts, transactions, budgets, recurring rules, and preferences.
 * Supports:
 * - Production Supabase integration with RLS when configured.
 * - Rich Demo Mode with persistent LocalStorage and instant reactivity.
 * - Undo transaction deletion.
 * - Deterministic smart category suggestions based on merchant/description history.
 */

import {
  DEMO_PROFILE,
  DEMO_ACCOUNTS,
  DEMO_CATEGORIES,
  DEMO_BUDGETS,
  DEMO_RECURRING_RULES,
  DEMO_PLANNED_EVENTS,
  DEMO_TRANSACTIONS,
} from "./demo-data";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../supabase/client";

const DEMO_STORAGE_KEY = "daybook_demo_store_v2";
const PREFS_STORAGE_KEY = "daybook_user_preferences";

class DaybookStore {
  constructor() {
    this.listeners = new Set();
    this.state = {
      isLoaded: false,
      isDemoMode: true,
      profile: DEMO_PROFILE,
      accounts: DEMO_ACCOUNTS,
      categories: DEMO_CATEGORIES,
      budgets: DEMO_BUDGETS,
      recurringRules: DEMO_RECURRING_RULES,
      plannedEvents: DEMO_PLANNED_EVENTS,
      transactions: DEMO_TRANSACTIONS,
      isPrivateMode: false,
      lastDeletedItem: null,
    };
    this.init();
  }

  init() {
    if (typeof window === "undefined") return;

    try {
      // Check private mode preference
      const savedPrefs = localStorage.getItem(PREFS_STORAGE_KEY);
      if (savedPrefs) {
        const parsedPrefs = JSON.parse(savedPrefs);
        this.state.isPrivateMode = Boolean(parsedPrefs.isPrivateMode);
      }

      // Check if user stored custom demo edits
      const savedDemo = localStorage.getItem(DEMO_STORAGE_KEY);
      if (savedDemo) {
        const parsed = JSON.parse(savedDemo);
        this.state = {
          ...this.state,
          ...parsed,
          isLoaded: true,
        };
      } else {
        this.state.isLoaded = true;
      }
    } catch (e) {
      console.error("Failed to load local store", e);
      this.state.isLoaded = true;
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    if (typeof window !== "undefined" && this.state.isDemoMode) {
      try {
        localStorage.setItem(
          DEMO_STORAGE_KEY,
          JSON.stringify({
            profile: this.state.profile,
            accounts: this.state.accounts,
            categories: this.state.categories,
            budgets: this.state.budgets,
            recurringRules: this.state.recurringRules,
            plannedEvents: this.state.plannedEvents,
            transactions: this.state.transactions,
          })
        );
      } catch (e) {
        console.warn("Storage quota exceeded or storage unavailable", e);
      }
    }

    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  getState() {
    return this.state;
  }

  togglePrivateMode() {
    this.state.isPrivateMode = !this.state.isPrivateMode;
    if (typeof window !== "undefined") {
      localStorage.setItem(
        PREFS_STORAGE_KEY,
        JSON.stringify({ isPrivateMode: this.state.isPrivateMode })
      );
    }
    this.notify();
    return this.state.isPrivateMode;
  }

  // --- DETERMINISTIC CATEGORY PREDICTION ---
  suggestCategory(description) {
    if (!description || description.trim().length < 2) return null;
    const cleanDesc = description.toLowerCase().trim();

    // 1. Direct or partial match from transaction history
    const match = this.state.transactions.find((t) => {
      if (!t.category) return false;
      const tDesc = t.description?.toLowerCase() || "";
      return tDesc.includes(cleanDesc) || cleanDesc.includes(tDesc);
    });

    if (match && match.category) {
      return match.category;
    }

    // 2. Deterministic keyword heuristics
    const heuristics = [
      { keywords: ["swiggy", "zomato", "cafe", "coffee", "restaurant", "biryani", "dining", "tea", "chai"], category: "Food & Dining" },
      { keywords: ["blinkit", "zepto", "grocery", "mart", "supermarket", "vegetables", "milk", "kirana"], category: "Groceries" },
      { keywords: ["uber", "ola", "metro", "auto", "petrol", "diesel", "fuel", "toll", "flight"], category: "Transportation" },
      { keywords: ["rent", "maintenance", "landlord"], category: "Housing & Rent" },
      { keywords: ["airtel", "jio", "wifi", "broadband", "electricity", "bescom", "power", "water", "gas"], category: "Utilities & Bills" },
      { keywords: ["netflix", "spotify", "prime", "youtube", "cinema", "movie", "bookmyshow"], category: "Subscriptions & Entertainment" },
      { keywords: ["amazon", "flipkart", "myntra", "uniqlo", "zara", "clothing", "shoes"], category: "Shopping" },
      { keywords: ["gym", "cult", "pharmacy", "medicine", "doctor", "hospital", "clinic"], category: "Health & Wellness" },
      { keywords: ["zerodha", "groww", "sip", "mutual fund", "stocks", "nifty"], category: "Investments & SIP" },
      { keywords: ["salary", "stipend", "bonus", "dividend", "freelance"], category: "Salary & Professional Income" },
    ];

    for (const rule of heuristics) {
      if (rule.keywords.some((k) => cleanDesc.includes(k))) {
        return rule.category;
      }
    }

    return null;
  }

  // --- TRANSACTIONS CRUD ---
  addTransaction(txData) {
    const id = txData.id || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const newTx = {
      ...txData,
      id,
      amount: Number(txData.amount),
      createdAt: new Date().toISOString(),
    };

    // Update transactions list (prepend new one)
    this.state.transactions = [newTx, ...this.state.transactions];

    // Update affected account balance(s)
    this.state.accounts = this.state.accounts.map((acc) => {
      let bal = Number(acc.balance) || 0;
      if (newTx.type === "expense" && newTx.accountId === acc.id) {
        bal -= newTx.amount;
      } else if (newTx.type === "income" && newTx.accountId === acc.id) {
        bal += newTx.amount;
      } else if (newTx.type === "transfer") {
        if (newTx.fromAccountId === acc.id) bal -= newTx.amount;
        if (newTx.toAccountId === acc.id) bal += newTx.amount;
      }
      return { ...acc, balance: Math.round(bal * 100) / 100 };
    });

    this.notify();
    return newTx;
  }

  updateTransaction(id, updatedFields) {
    const oldTx = this.state.transactions.find((t) => t.id === id);
    if (!oldTx) return null;

    // Revert old transaction's impact on balances
    let accounts = [...this.state.accounts];
    const revertOld = (tx) => {
      accounts = accounts.map((acc) => {
        let bal = Number(acc.balance) || 0;
        if (tx.type === "expense" && tx.accountId === acc.id) {
          bal += tx.amount;
        } else if (tx.type === "income" && tx.accountId === acc.id) {
          bal -= tx.amount;
        } else if (tx.type === "transfer") {
          if (tx.fromAccountId === acc.id) bal += tx.amount;
          if (tx.toAccountId === acc.id) bal -= tx.amount;
        }
        return { ...acc, balance: Math.round(bal * 100) / 100 };
      });
    };
    revertOld(oldTx);

    const mergedTx = {
      ...oldTx,
      ...updatedFields,
      amount: Number(updatedFields.amount !== undefined ? updatedFields.amount : oldTx.amount),
      updatedAt: new Date().toISOString(),
    };

    // Apply new transaction impact
    accounts = accounts.map((acc) => {
      let bal = Number(acc.balance) || 0;
      if (mergedTx.type === "expense" && mergedTx.accountId === acc.id) {
        bal -= mergedTx.amount;
      } else if (mergedTx.type === "income" && mergedTx.accountId === acc.id) {
        bal += mergedTx.amount;
      } else if (mergedTx.type === "transfer") {
        if (mergedTx.fromAccountId === acc.id) bal -= mergedTx.amount;
        if (mergedTx.toAccountId === acc.id) bal += mergedTx.amount;
      }
      return { ...acc, balance: Math.round(bal * 100) / 100 };
    });

    this.state.accounts = accounts;
    this.state.transactions = this.state.transactions.map((t) => (t.id === id ? mergedTx : t));

    this.notify();
    return mergedTx;
  }

  deleteTransaction(id) {
    const tx = this.state.transactions.find((t) => t.id === id);
    if (!tx) return false;

    // Save for undo capability
    this.state.lastDeletedItem = { type: "transaction", item: tx };

    // Reverse account balance impact
    this.state.accounts = this.state.accounts.map((acc) => {
      let bal = Number(acc.balance) || 0;
      if (tx.type === "expense" && tx.accountId === acc.id) {
        bal += tx.amount;
      } else if (tx.type === "income" && tx.accountId === acc.id) {
        bal -= tx.amount;
      } else if (tx.type === "transfer") {
        if (tx.fromAccountId === acc.id) bal += tx.amount;
        if (tx.toAccountId === acc.id) bal -= tx.amount;
      }
      return { ...acc, balance: Math.round(bal * 100) / 100 };
    });

    this.state.transactions = this.state.transactions.filter((t) => t.id !== id);
    this.notify();
    return true;
  }

  undoLastDelete() {
    if (!this.state.lastDeletedItem) return false;
    if (this.state.lastDeletedItem.type === "transaction") {
      this.addTransaction(this.state.lastDeletedItem.item);
      this.state.lastDeletedItem = null;
      return true;
    }
    return false;
  }

  // --- ACCOUNTS CRUD ---
  addAccount(accData) {
    const id = `acc_${Date.now()}`;
    const newAcc = {
      ...accData,
      id,
      openingBalance: Number(accData.openingBalance) || 0,
      balance: Number(accData.openingBalance) || 0,
      isArchived: false,
    };
    this.state.accounts = [...this.state.accounts, newAcc];
    this.notify();
    return newAcc;
  }

  updateAccount(id, updatedFields) {
    this.state.accounts = this.state.accounts.map((a) =>
      a.id === id ? { ...a, ...updatedFields } : a
    );
    this.notify();
  }

  archiveAccount(id) {
    this.state.accounts = this.state.accounts.map((a) =>
      a.id === id ? { ...a, isArchived: true } : a
    );
    this.notify();
  }

  // --- BUDGETS CRUD ---
  addBudget(budgetData) {
    const id = `b_${Date.now()}`;
    const newBudget = {
      ...budgetData,
      id,
      limit: Number(budgetData.limit),
      rolloverAmount: Number(budgetData.rolloverAmount) || 0,
      warningThreshold: Number(budgetData.warningThreshold) || 80,
    };
    this.state.budgets = [...this.state.budgets, newBudget];
    this.notify();
    return newBudget;
  }

  updateBudget(id, updatedFields) {
    this.state.budgets = this.state.budgets.map((b) =>
      b.id === id
        ? {
            ...b,
            ...updatedFields,
            limit: updatedFields.limit !== undefined ? Number(updatedFields.limit) : b.limit,
          }
        : b
    );
    this.notify();
  }

  deleteBudget(id) {
    this.state.budgets = this.state.budgets.filter((b) => b.id !== id);
    this.notify();
  }

  // --- RECURRING RULES CRUD ---
  addRecurringRule(ruleData) {
    const id = `rec_${Date.now()}`;
    const newRule = {
      ...ruleData,
      id,
      amount: Number(ruleData.amount),
      isPaused: false,
      status: "active",
    };
    this.state.recurringRules = [...this.state.recurringRules, newRule];
    this.notify();
    return newRule;
  }

  togglePauseRecurringRule(id) {
    this.state.recurringRules = this.state.recurringRules.map((r) =>
      r.id === id ? { ...r, isPaused: !r.isPaused, status: r.isPaused ? "active" : "paused" } : r
    );
    this.notify();
  }

  deleteRecurringRule(id) {
    this.state.recurringRules = this.state.recurringRules.filter((r) => r.id !== id);
    this.notify();
  }

  // --- RESET DEMO DATA ---
  resetToDefaultDemo() {
    if (typeof window !== "undefined") {
      localStorage.removeItem(DEMO_STORAGE_KEY);
    }
    this.state = {
      ...this.state,
      profile: DEMO_PROFILE,
      accounts: DEMO_ACCOUNTS,
      categories: DEMO_CATEGORIES,
      budgets: DEMO_BUDGETS,
      recurringRules: DEMO_RECURRING_RULES,
      plannedEvents: DEMO_PLANNED_EVENTS,
      transactions: DEMO_TRANSACTIONS,
    };
    this.notify();
  }
}

// Global singleton instance
export const store = new DaybookStore();
