/**
 * Daybook Data Repository & Reactive State Store
 * 
 * Manages accounts, transactions, budgets, recurring rules, and preferences.
 * Seamlessly integrates:
 * 1. Supabase PostgreSQL & Auth with Row Level Security (RLS) when logged in.
 * 2. Rich Demo Mode with persistent LocalStorage and instant reactivity when in demo.
 * 3. Undo transaction deletion.
 * 4. Deterministic smart category suggestions based on merchant/description history.
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

export function isValidUUID(str) {
  if (!str || typeof str !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

class DaybookStore {
  constructor() {
    this.listeners = new Set();
    this.state = {
      isLoaded: false,
      isDemoMode: true,
      user: null, // Logged in Supabase user
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
      // 1. Check private mode preference
      const savedPrefs = localStorage.getItem(PREFS_STORAGE_KEY);
      if (savedPrefs) {
        const parsedPrefs = JSON.parse(savedPrefs);
        this.state.isPrivateMode = Boolean(parsedPrefs.isPrivateMode);
      }

      // 2. Check if Supabase has an active authenticated user
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          // Listen to auth state transitions
          supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
              await this.loadUserDataFromSupabase(session.user);
            } else if (event === "SIGNED_OUT") {
              this.switchToDemoMode();
            }
          });

          // Check current active session
          supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session?.user) {
              await this.loadUserDataFromSupabase(session.user);
            } else {
              this.loadDemoData();
            }
          }).catch(() => {
            this.loadDemoData();
          });
          return;
        }
      }

      this.loadDemoData();
    } catch (e) {
      console.error("Failed to initialize store", e);
      this.loadDemoData();
    }
  }

  loadDemoData() {
    try {
      const savedDemo = localStorage.getItem(DEMO_STORAGE_KEY);
      if (savedDemo) {
        const parsed = JSON.parse(savedDemo);
        this.state = {
          ...this.state,
          ...parsed,
          isDemoMode: true,
          user: null,
          isLoaded: true,
        };
      } else {
        this.state = {
          ...this.state,
          profile: DEMO_PROFILE,
          accounts: DEMO_ACCOUNTS,
          categories: DEMO_CATEGORIES,
          budgets: DEMO_BUDGETS,
          recurringRules: DEMO_RECURRING_RULES,
          plannedEvents: DEMO_PLANNED_EVENTS,
          transactions: DEMO_TRANSACTIONS,
          isDemoMode: true,
          user: null,
          isLoaded: true,
        };
      }
    } catch {
      this.state.isLoaded = true;
    }
    this.notify();
  }

  // --- SUPABASE DATA LOADER ---
  async loadUserDataFromSupabase(user) {
    if (!user) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    try {
      this.state.user = user;
      this.state.isDemoMode = false;

      // 1. Fetch Profile
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileRow) {
        this.state.profile = {
          id: profileRow.id,
          fullName: profileRow.full_name || user.user_metadata?.full_name || "User",
          email: user.email,
          currency: profileRow.currency || "INR",
          paydayDayOfMonth: profileRow.payday_day_of_month || 30,
          isPaydayConfigured: Boolean(profileRow.is_payday_configured),
          expectedPaydayIncome: Number(profileRow.expected_payday_income) || 0,
        };
      } else {
        // Create initial profile in Supabase
        const initialProfile = {
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
          currency: user.user_metadata?.currency || "INR",
          payday_day_of_month: user.user_metadata?.payday_day_of_month || 30,
          is_payday_configured: true,
          expected_payday_income: 0,
        };
        await supabase.from("profiles").upsert(initialProfile);
        this.state.profile = {
          id: user.id,
          fullName: initialProfile.full_name,
          email: user.email,
          currency: initialProfile.currency,
          paydayDayOfMonth: initialProfile.payday_day_of_month,
          isPaydayConfigured: true,
          expectedPaydayIncome: 0,
        };
      }

      // 2. Fetch Accounts
      const { data: accountsRows } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (accountsRows && accountsRows.length > 0) {
        this.state.accounts = accountsRows.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          openingBalance: Number(a.opening_balance) || 0,
          balance: Number(a.current_balance) || 0,
          includeInNetWorth: Boolean(a.include_in_net_worth),
          isArchived: Boolean(a.is_archived),
          color: a.color || "#456B50",
          accountNumber: a.icon || "",
        }));
      } else {
        // First time user: Create default primary account
        const primaryAcc = {
          user_id: user.id,
          name: "Primary Bank Account",
          type: "checking",
          opening_balance: 0,
          current_balance: 0,
          include_in_net_worth: true,
          is_archived: false,
          color: "#456B50",
        };
        const { data: createdAcc } = await supabase.from("accounts").insert(primaryAcc).select().single();
        if (createdAcc) {
          this.state.accounts = [{
            id: createdAcc.id,
            name: createdAcc.name,
            type: createdAcc.type,
            openingBalance: 0,
            balance: 0,
            includeInNetWorth: true,
            isArchived: false,
            color: "#456B50",
            accountNumber: "",
          }];
        } else {
          this.state.accounts = [];
        }
      }

      // 3. Fetch Categories
      const { data: categoriesRows } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id);

      if (categoriesRows && categoriesRows.length > 0) {
        this.state.categories = categoriesRows;
      } else {
        // Seed standard categories for this user
        const defaultCats = DEMO_CATEGORIES.map((c) => ({
          user_id: user.id,
          name: c.name,
          type: c.type,
          icon: c.icon,
          color: c.color,
          is_default: true,
        }));
        const { data: seededCats } = await supabase.from("categories").insert(defaultCats).select();
        this.state.categories = seededCats || DEMO_CATEGORIES;
      }

      // 4. Fetch Transactions (with splits)
      const { data: txRows } = await supabase
        .from("transactions")
        .select("*, transaction_splits(*)")
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      this.state.transactions = (txRows || []).map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        date: t.date,
        description: t.description,
        category: t.category,
        accountId: t.account_id,
        fromAccountId: t.from_account_id,
        toAccountId: t.to_account_id,
        paymentMethod: t.payment_method,
        notes: t.notes || "",
        tags: t.tags || [],
        isSplit: Boolean(t.is_split),
        splits: (t.transaction_splits || []).map((s) => ({
          amount: Number(s.amount),
          category: s.category,
          notes: s.notes || "",
        })),
      }));

      // 5. Fetch Budgets
      const { data: budgetRows } = await supabase
        .from("budgets")
        .select("*")
        .eq("user_id", user.id);

      this.state.budgets = (budgetRows || []).map((b) => ({
        id: b.id,
        category: b.category,
        limit: Number(b.limit_amount),
        period: b.period || "monthly",
        rolloverAmount: Number(b.rollover_amount) || 0,
        warningThreshold: b.warning_threshold || 80,
      }));

      // 6. Fetch Recurring Rules
      const { data: recurringRows } = await supabase
        .from("recurring_rules")
        .select("*")
        .eq("user_id", user.id);

      this.state.recurringRules = (recurringRows || []).map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        amount: Number(r.amount),
        category: r.category,
        accountId: r.account_id,
        frequency: r.frequency,
        startDate: r.start_date,
        nextDueDate: r.next_due_date,
        isPaused: Boolean(r.is_paused),
        status: r.status,
      }));

      // 7. Fetch Planned Events
      const { data: plannedRows } = await supabase
        .from("planned_events")
        .select("*")
        .eq("user_id", user.id);

      this.state.plannedEvents = (plannedRows || []).map((p) => ({
        id: p.id,
        title: p.title,
        amount: Number(p.amount),
        date: p.date,
        type: p.type,
        category: p.category,
        isCompleted: Boolean(p.is_completed),
      }));

      this.state.isLoaded = true;
      this.notify();
    } catch (e) {
      console.error("Failed to load Supabase data:", e);
      this.state.isLoaded = true;
      this.notify();
    }
  }

  switchToDemoMode() {
    this.state.isDemoMode = true;
    this.state.user = null;
    this.loadDemoData();
  }

  async signOut() {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
    }
    this.switchToDemoMode();
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
        console.warn("Storage quota exceeded", e);
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

    const match = this.state.transactions.find((t) => {
      if (!t.category) return false;
      const tDesc = t.description?.toLowerCase() || "";
      return tDesc.includes(cleanDesc) || cleanDesc.includes(tDesc);
    });

    if (match && match.category) return match.category;

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

  // --- TRANSACTIONS CRUD (DUAL SUPABASE + DEMO) ---
  async addTransaction(txData) {
    const id = txData.id || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const newTx = {
      ...txData,
      id,
      amount: Number(txData.amount),
      createdAt: new Date().toISOString(),
    };

    // 1. Optimistic Local State Update
    this.state.transactions = [newTx, ...this.state.transactions];

    this.state.accounts = this.state.accounts.map((acc) => {
      let bal = Number(acc.balance) || 0;
      if (newTx.type === "expense" && newTx.accountId === acc.id) bal -= newTx.amount;
      else if (newTx.type === "income" && newTx.accountId === acc.id) bal += newTx.amount;
      else if (newTx.type === "transfer") {
        if (newTx.fromAccountId === acc.id) bal -= newTx.amount;
        if (newTx.toAccountId === acc.id) bal += newTx.amount;
      }
      return { ...acc, balance: Math.round(bal * 100) / 100 };
    });

    this.notify();

    // 2. Supabase Cloud Sync if authenticated
    if (!this.state.isDemoMode && this.state.user && isSupabaseConfigured()) {
      const supabase = getSupabaseBrowserClient();
        const targetAccId = newTx.type === "transfer" ? null : (isValidUUID(newTx.accountId) ? newTx.accountId : null);
        const fromAccId = newTx.type === "transfer" && isValidUUID(newTx.fromAccountId) ? newTx.fromAccountId : null;
        const toAccId = newTx.type === "transfer" && isValidUUID(newTx.toAccountId) ? newTx.toAccountId : null;

        const { data: dbTx, error } = await supabase
          .from("transactions")
          .insert({
            user_id: this.state.user.id,
            type: newTx.type,
            amount: newTx.amount,
            date: newTx.date,
            description: newTx.description,
            category: newTx.category,
            account_id: targetAccId,
            from_account_id: fromAccId,
            to_account_id: toAccId,
            payment_method: newTx.paymentMethod || "UPI",
            notes: newTx.notes || "",
            tags: newTx.tags || [],
            is_split: Boolean(newTx.isSplit),
          })
          .select()
          .single();

        if (dbTx) {
          newTx.id = dbTx.id;
          this.state.transactions = this.state.transactions.map((t) =>
            t.id === id ? newTx : t
          );
          this.notify();
        }

        if (dbTx && newTx.isSplit && newTx.splits?.length) {
          const splitsPayload = newTx.splits.map((s) => ({
            transaction_id: dbTx.id,
            category: s.category,
            amount: s.amount,
            notes: s.notes || "",
          }));
          await supabase.from("transaction_splits").insert(splitsPayload);
        }

        // Update remote account balance
        for (const acc of this.state.accounts) {
          if (isValidUUID(acc.id)) {
            await supabase
              .from("accounts")
              .update({ current_balance: acc.balance })
              .eq("id", acc.id)
              .eq("user_id", this.state.user.id);
          }
        }
      } catch (err) {
        console.error("Supabase transaction sync error:", err);
      }
    }

    return newTx;
  }

  async updateTransaction(id, updatedFields) {
    const oldTx = this.state.transactions.find((t) => t.id === id);
    if (!oldTx) return null;

    let accounts = [...this.state.accounts];
    const revertOld = (tx) => {
      accounts = accounts.map((acc) => {
        let bal = Number(acc.balance) || 0;
        if (tx.type === "expense" && tx.accountId === acc.id) bal += tx.amount;
        else if (tx.type === "income" && tx.accountId === acc.id) bal -= tx.amount;
        else if (tx.type === "transfer") {
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

    accounts = accounts.map((acc) => {
      let bal = Number(acc.balance) || 0;
      if (mergedTx.type === "expense" && mergedTx.accountId === acc.id) bal -= mergedTx.amount;
      else if (mergedTx.type === "income" && mergedTx.accountId === acc.id) bal += mergedTx.amount;
      else if (mergedTx.type === "transfer") {
        if (mergedTx.fromAccountId === acc.id) bal -= mergedTx.amount;
        if (mergedTx.toAccountId === acc.id) bal += mergedTx.amount;
      }
      return { ...acc, balance: Math.round(bal * 100) / 100 };
    });

    this.state.accounts = accounts;
    this.state.transactions = this.state.transactions.map((t) => (t.id === id ? mergedTx : t));
    this.notify();

    if (!this.state.isDemoMode && this.state.user && isSupabaseConfigured()) {
      const supabase = getSupabaseBrowserClient();
      try {
        await supabase
          .from("transactions")
          .update({
            amount: mergedTx.amount,
            description: mergedTx.description,
            category: mergedTx.category,
            date: mergedTx.date,
            payment_method: mergedTx.paymentMethod,
            notes: mergedTx.notes,
            tags: mergedTx.tags,
          })
          .eq("id", id)
          .eq("user_id", this.state.user.id);
      } catch (err) {
        console.error("Supabase update error:", err);
      }
    }

    return mergedTx;
  }

  async deleteTransaction(id) {
    const tx = this.state.transactions.find((t) => t.id === id);
    if (!tx) return false;

    this.state.lastDeletedItem = { type: "transaction", item: tx };

    this.state.accounts = this.state.accounts.map((acc) => {
      let bal = Number(acc.balance) || 0;
      if (tx.type === "expense" && tx.accountId === acc.id) bal += tx.amount;
      else if (tx.type === "income" && tx.accountId === acc.id) bal -= tx.amount;
      else if (tx.type === "transfer") {
        if (tx.fromAccountId === acc.id) bal += tx.amount;
        if (tx.toAccountId === acc.id) bal -= tx.amount;
      }
      return { ...acc, balance: Math.round(bal * 100) / 100 };
    });

    this.state.transactions = this.state.transactions.filter((t) => t.id !== id);
    this.notify();

    if (!this.state.isDemoMode && this.state.user && isSupabaseConfigured()) {
      const supabase = getSupabaseBrowserClient();
      try {
        await supabase
          .from("transactions")
          .delete()
          .eq("id", id)
          .eq("user_id", this.state.user.id);
      } catch (err) {
        console.error("Supabase delete error:", err);
      }
    }

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
  async addAccount(accData) {
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

    if (!this.state.isDemoMode && this.state.user && isSupabaseConfigured()) {
      const supabase = getSupabaseBrowserClient();
      try {
        const { data } = await supabase
          .from("accounts")
          .insert({
            user_id: this.state.user.id,
            name: newAcc.name,
            type: newAcc.type,
            opening_balance: newAcc.openingBalance,
            current_balance: newAcc.balance,
            color: newAcc.color,
          })
          .select()
          .single();
        if (data) {
          newAcc.id = data.id;
          this.state.accounts = this.state.accounts.map((a) =>
            a.id === id ? newAcc : a
          );
          this.notify();
        }
      } catch (err) {
        console.error("Supabase account add error:", err);
      }
    }

    return newAcc;
  }

  async updateAccount(id, updatedFields) {
    this.state.accounts = this.state.accounts.map((a) =>
      a.id === id ? { ...a, ...updatedFields } : a
    );
    this.notify();

    if (!this.state.isDemoMode && this.state.user && isSupabaseConfigured()) {
      const supabase = getSupabaseBrowserClient();
      try {
        await supabase
          .from("accounts")
          .update({
            name: updatedFields.name,
            color: updatedFields.color,
          })
          .eq("id", id)
          .eq("user_id", this.state.user.id);
      } catch (err) {
        console.error("Supabase account update error:", err);
      }
    }
  }

  async archiveAccount(id) {
    this.state.accounts = this.state.accounts.map((a) =>
      a.id === id ? { ...a, isArchived: true } : a
    );
    this.notify();

    if (!this.state.isDemoMode && this.state.user && isSupabaseConfigured()) {
      const supabase = getSupabaseBrowserClient();
      try {
        await supabase
          .from("accounts")
          .update({ is_archived: true })
          .eq("id", id)
          .eq("user_id", this.state.user.id);
      } catch (err) {
        console.error("Supabase account archive error:", err);
      }
    }
  }

  // --- BUDGETS CRUD ---
  async addBudget(budgetData) {
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

    if (!this.state.isDemoMode && this.state.user && isSupabaseConfigured()) {
      const supabase = getSupabaseBrowserClient();
      try {
        const { data } = await supabase
          .from("budgets")
          .insert({
            user_id: this.state.user.id,
            category: newBudget.category,
            limit_amount: newBudget.limit,
            period: newBudget.period,
            rollover_amount: newBudget.rolloverAmount,
            warning_threshold: newBudget.warningThreshold,
          })
          .select()
          .single();
        if (data) {
          newBudget.id = data.id;
          this.state.budgets = this.state.budgets.map((b) =>
            b.id === id ? newBudget : b
          );
          this.notify();
        }
      } catch (err) {
        console.error("Supabase budget add error:", err);
      }
    }

    return newBudget;
  }

  async updateBudget(id, updatedFields) {
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

    if (!this.state.isDemoMode && this.state.user && isSupabaseConfigured()) {
      const supabase = getSupabaseBrowserClient();
      try {
        await supabase
          .from("budgets")
          .update({
            limit_amount: updatedFields.limit,
            rollover_amount: updatedFields.rolloverAmount,
            warning_threshold: updatedFields.warningThreshold,
          })
          .eq("id", id)
          .eq("user_id", this.state.user.id);
      } catch (err) {
        console.error("Supabase budget update error:", err);
      }
    }
  }

  async deleteBudget(id) {
    this.state.budgets = this.state.budgets.filter((b) => b.id !== id);
    this.notify();

    if (!this.state.isDemoMode && this.state.user && isSupabaseConfigured()) {
      const supabase = getSupabaseBrowserClient();
      try {
        await supabase
          .from("budgets")
          .delete()
          .eq("id", id)
          .eq("user_id", this.state.user.id);
      } catch (err) {
        console.error("Supabase budget delete error:", err);
      }
    }
  }

  // --- RECURRING RULES CRUD ---
  async addRecurringRule(ruleData) {
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

    if (!this.state.isDemoMode && this.state.user && isSupabaseConfigured()) {
      const supabase = getSupabaseBrowserClient();
      try {
        const { data } = await supabase
          .from("recurring_rules")
          .insert({
            user_id: this.state.user.id,
            name: newRule.name,
            type: newRule.type,
            amount: newRule.amount,
            category: newRule.category,
            account_id: newRule.accountId,
            frequency: newRule.frequency,
            start_date: newRule.startDate,
            next_due_date: newRule.nextDueDate,
            is_paused: false,
            status: "active",
          })
          .select()
          .single();
        if (data) {
          newRule.id = data.id;
          this.state.recurringRules = this.state.recurringRules.map((r) =>
            r.id === id ? newRule : r
          );
          this.notify();
        }
      } catch (err) {
        console.error("Supabase recurring rule add error:", err);
      }
    }

    return newRule;
  }

  async togglePauseRecurringRule(id) {
    const rule = this.state.recurringRules.find((r) => r.id === id);
    if (!rule) return;
    const newPaused = !rule.isPaused;

    this.state.recurringRules = this.state.recurringRules.map((r) =>
      r.id === id ? { ...r, isPaused: newPaused, status: newPaused ? "paused" : "active" } : r
    );
    this.notify();

    if (!this.state.isDemoMode && this.state.user && isSupabaseConfigured()) {
      const supabase = getSupabaseBrowserClient();
      try {
        await supabase
          .from("recurring_rules")
          .update({ is_paused: newPaused, status: newPaused ? "paused" : "active" })
          .eq("id", id)
          .eq("user_id", this.state.user.id);
      } catch (err) {
        console.error("Supabase recurring toggle error:", err);
      }
    }
  }

  async deleteRecurringRule(id) {
    this.state.recurringRules = this.state.recurringRules.filter((r) => r.id !== id);
    this.notify();

    if (!this.state.isDemoMode && this.state.user && isSupabaseConfigured()) {
      const supabase = getSupabaseBrowserClient();
      try {
        await supabase
          .from("recurring_rules")
          .delete()
          .eq("id", id)
          .eq("user_id", this.state.user.id);
      } catch (err) {
        console.error("Supabase recurring delete error:", err);
      }
    }
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
      isDemoMode: true,
      user: null,
    };
    this.notify();
  }
}

// Global singleton instance
export const store = new DaybookStore();
