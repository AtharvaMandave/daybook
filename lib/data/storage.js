/**
 * Daybook Data Repository & Reactive State Store
 * 
 * Manages accounts, transactions, budgets, recurring rules, and preferences.
 * Seamlessly integrates:
 * 1. Supabase PostgreSQL & Auth with Row Level Security (RLS) when logged in.
 * 2. Clean, instant offline persistence in LocalStorage.
 * 3. Undo transaction deletion.
 * 4. Deterministic smart category suggestions based on merchant/description history.
 */

import { DEFAULT_CATEGORIES } from "./categories";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../supabase/client";

const LEDGER_STORAGE_KEY = "daybook_ledger_store_v3";
const PREFS_STORAGE_KEY = "daybook_user_preferences";

export const DEFAULT_PROFILE = {
  fullName: "User",
  email: "",
  currency: "INR",
  paydayDayOfMonth: 30,
  isPaydayConfigured: true,
  expectedPaydayIncome: 0,
};

export function isValidUUID(str) {
  if (!str || typeof str !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

class DaybookStore {
  constructor() {
    this.listeners = new Set();
    this.state = {
      isLoaded: false,
      user: null, // Logged in Supabase user
      profile: { ...DEFAULT_PROFILE },
      accounts: [],
      categories: [...DEFAULT_CATEGORIES],
      budgets: [],
      recurringRules: [],
      plannedEvents: [],
      transactions: [],
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

      // Clean up legacy demo storage key if present
      localStorage.removeItem("daybook_demo_store_v2");

      // 2. Check if Supabase has an active authenticated user
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          // Listen to auth state transitions
          supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
              await this.loadUserDataFromSupabase(session.user);
            } else if (event === "SIGNED_OUT") {
              this.handleSignOutClean();
            }
          });

          // Check current active session
          supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session?.user) {
              await this.loadUserDataFromSupabase(session.user);
            } else {
              this.loadLocalData();
            }
          }).catch(() => {
            this.loadLocalData();
          });
          return;
        }
      }

      this.loadLocalData();
    } catch (e) {
      console.error("Failed to initialize store", e);
      this.loadLocalData();
    }
  }

  loadLocalData() {
    try {
      const saved = localStorage.getItem(LEDGER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.state = {
          ...this.state,
          profile: parsed.profile || { ...DEFAULT_PROFILE },
          accounts: parsed.accounts || [],
          categories: parsed.categories && parsed.categories.length > 0 ? parsed.categories : [...DEFAULT_CATEGORIES],
          budgets: parsed.budgets || [],
          recurringRules: parsed.recurringRules || [],
          plannedEvents: parsed.plannedEvents || [],
          transactions: parsed.transactions || [],
          user: null,
          isLoaded: true,
        };
      } else {
        this.state = {
          ...this.state,
          profile: { ...DEFAULT_PROFILE },
          accounts: [],
          categories: [...DEFAULT_CATEGORIES],
          budgets: [],
          recurringRules: [],
          plannedEvents: [],
          transactions: [],
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
        this.state.accounts = [];
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
        const defaultCats = DEFAULT_CATEGORIES.map((c) => ({
          user_id: user.id,
          name: c.name,
          type: c.type,
          icon: c.icon,
          color: c.color,
          is_default: true,
        }));
        const { data: seededCats } = await supabase.from("categories").insert(defaultCats).select();
        this.state.categories = seededCats || [...DEFAULT_CATEGORIES];
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

  async signOut() {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
    }
    this.handleSignOutClean();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }

  handleSignOutClean() {
    this.state.user = null;
    this.state.profile = { ...DEFAULT_PROFILE };
    this.state.accounts = [];
    this.state.transactions = [];
    this.state.budgets = [];
    this.state.recurringRules = [];
    this.state.plannedEvents = [];
    this.state.categories = [...DEFAULT_CATEGORIES];
    this.state.isLoaded = true;
    if (typeof window !== "undefined") {
      localStorage.removeItem(LEDGER_STORAGE_KEY);
      localStorage.removeItem("daybook_demo_store_v2");
    }
    this.notify();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          LEDGER_STORAGE_KEY,
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

  // --- TRANSACTIONS CRUD (SUPABASE + LOCALSTORAGE) ---
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
    if (this.state.user && isSupabaseConfigured()) {
      const supabase = getSupabaseBrowserClient();
      try {
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
            category: newTx.type === "transfer" ? null : newTx.category,
            account_id: targetAccId,
            from_account_id: fromAccId,
            to_account_id: toAccId,
            payment_method: newTx.paymentMethod || "UPI",
            notes: newTx.notes || "",
            tags: Array.isArray(newTx.tags) ? newTx.tags : [],
            is_split: Boolean(newTx.isSplit),
          })
          .select()
          .single();

        if (error) {
          console.error("Supabase transaction insert failed:", error);
          return newTx;
        }

        if (dbTx?.id) {
          this.state.transactions = this.state.transactions.map((t) =>
            t.id === id ? { ...t, id: dbTx.id } : t
          );
          newTx.id = dbTx.id;
        }

        // Insert splits if present
        if (newTx.isSplit && Array.isArray(newTx.splits) && newTx.splits.length > 0 && dbTx?.id) {
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

    if (this.state.user && isSupabaseConfigured() && isValidUUID(id)) {
      const supabase = getSupabaseBrowserClient();
      try {
        await supabase
          .from("transactions")
          .update({
            type: mergedTx.type,
            amount: mergedTx.amount,
            date: mergedTx.date,
            description: mergedTx.description,
            category: mergedTx.type === "transfer" ? null : mergedTx.category,
            account_id: isValidUUID(mergedTx.accountId) ? mergedTx.accountId : null,
            from_account_id: isValidUUID(mergedTx.fromAccountId) ? mergedTx.fromAccountId : null,
            to_account_id: isValidUUID(mergedTx.toAccountId) ? mergedTx.toAccountId : null,
            payment_method: mergedTx.paymentMethod,
            notes: mergedTx.notes,
            tags: Array.isArray(mergedTx.tags) ? mergedTx.tags : [],
            is_split: Boolean(mergedTx.isSplit),
          })
          .eq("id", id)
          .eq("user_id", this.state.user.id);

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
        console.error("Supabase update error:", err);
      }
    }

    return mergedTx;
  }

  async deleteTransaction(id) {
    const tx = this.state.transactions.find((t) => t.id === id);
    if (!tx) return false;

    this.state.lastDeletedItem = {
      type: "transaction",
      data: { ...tx },
    };

    this.state.transactions = this.state.transactions.filter((t) => t.id !== id);

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

    this.notify();

    if (this.state.user && isSupabaseConfigured() && isValidUUID(id)) {
      const supabase = getSupabaseBrowserClient();
      try {
        await supabase
          .from("transactions")
          .delete()
          .eq("id", id)
          .eq("user_id", this.state.user.id);

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
        console.error("Supabase delete error:", err);
      }
    }

    return true;
  }

  undoLastDelete() {
    if (!this.state.lastDeletedItem) return false;
    const { type, data } = this.state.lastDeletedItem;
    if (type === "transaction" && data) {
      this.addTransaction(data);
      this.state.lastDeletedItem = null;
      return true;
    }
    return false;
  }

  // --- ACCOUNTS CRUD ---
  async addAccount(accData) {
    const id = accData.id || `acc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const newAcc = {
      ...accData,
      id,
      openingBalance: Number(accData.openingBalance) || 0,
      balance: Number(accData.balance !== undefined ? accData.balance : accData.openingBalance) || 0,
      includeInNetWorth: accData.includeInNetWorth !== undefined ? accData.includeInNetWorth : true,
      isArchived: false,
      color: accData.color || "#456B50",
      accountNumber: accData.accountNumber || "",
    };

    this.state.accounts = [...this.state.accounts, newAcc];
    this.notify();

    if (this.state.user && isSupabaseConfigured()) {
      const supabase = getSupabaseBrowserClient();
      try {
        const { data: dbAcc, error } = await supabase
          .from("accounts")
          .insert({
            user_id: this.state.user.id,
            name: newAcc.name,
            type: newAcc.type,
            opening_balance: newAcc.openingBalance,
            current_balance: newAcc.balance,
            include_in_net_worth: newAcc.includeInNetWorth,
            is_archived: false,
            color: newAcc.color,
            icon: newAcc.accountNumber || "",
          })
          .select()
          .single();

        if (error) {
          console.error("Supabase account insert failed:", error);
          return newAcc;
        }

        if (dbAcc?.id) {
          this.state.accounts = this.state.accounts.map((a) =>
            a.id === id ? { ...a, id: dbAcc.id } : a
          );
          newAcc.id = dbAcc.id;
          this.notify();
        }
      } catch (err) {
        console.error("Supabase account sync error:", err);
      }
    }

    return newAcc;
  }

  async updateAccount(id, updatedFields) {
    this.state.accounts = this.state.accounts.map((acc) =>
      acc.id === id ? { ...acc, ...updatedFields } : acc
    );
    this.notify();

    if (this.state.user && isSupabaseConfigured() && isValidUUID(id)) {
      const supabase = getSupabaseBrowserClient();
      try {
        const payload = {};
        if (updatedFields.name !== undefined) payload.name = updatedFields.name;
        if (updatedFields.type !== undefined) payload.type = updatedFields.type;
        if (updatedFields.includeInNetWorth !== undefined) payload.include_in_net_worth = updatedFields.includeInNetWorth;
        if (updatedFields.color !== undefined) payload.color = updatedFields.color;
        if (updatedFields.accountNumber !== undefined) payload.icon = updatedFields.accountNumber;

        await supabase
          .from("accounts")
          .update(payload)
          .eq("id", id)
          .eq("user_id", this.state.user.id);
      } catch (err) {
        console.error("Supabase account update error:", err);
      }
    }
  }

  async archiveAccount(id) {
    this.state.accounts = this.state.accounts.map((acc) =>
      acc.id === id ? { ...acc, isArchived: true } : acc
    );
    this.notify();

    if (this.state.user && isSupabaseConfigured() && isValidUUID(id)) {
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

  async deleteAccount(id) {
    this.state.accounts = this.state.accounts.filter((a) => a.id !== id);
    this.notify();

    if (this.state.user && isSupabaseConfigured() && isValidUUID(id)) {
      const supabase = getSupabaseBrowserClient();
      try {
        await supabase
          .from("accounts")
          .delete()
          .eq("id", id)
          .eq("user_id", this.state.user.id);
      } catch (err) {
        console.error("Supabase account delete error:", err);
      }
    }
  }

  // --- BUDGETS CRUD ---
  async addBudget(budgetData) {
    const id = budgetData.id || `b_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const newBudget = {
      ...budgetData,
      id,
      limit: Number(budgetData.limit),
      rolloverAmount: Number(budgetData.rolloverAmount) || 0,
      warningThreshold: Number(budgetData.warningThreshold) || 80,
      period: budgetData.period || "monthly",
    };

    this.state.budgets = [...this.state.budgets, newBudget];
    this.notify();

    if (this.state.user && isSupabaseConfigured()) {
      const supabase = getSupabaseBrowserClient();
      try {
        const { data: dbBudget, error } = await supabase
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

        if (error) {
          console.error("Supabase budget insert failed:", error);
          return newBudget;
        }

        if (dbBudget?.id) {
          this.state.budgets = this.state.budgets.map((b) =>
            b.id === id ? { ...b, id: dbBudget.id } : b
          );
          newBudget.id = dbBudget.id;
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
      b.id === id ? { ...b, ...updatedFields } : b
    );
    this.notify();

    if (this.state.user && isSupabaseConfigured() && isValidUUID(id)) {
      const supabase = getSupabaseBrowserClient();
      try {
        const payload = {};
        if (updatedFields.category !== undefined) payload.category = updatedFields.category;
        if (updatedFields.limit !== undefined) payload.limit_amount = updatedFields.limit;
        if (updatedFields.period !== undefined) payload.period = updatedFields.period;
        if (updatedFields.rolloverAmount !== undefined) payload.rollover_amount = updatedFields.rolloverAmount;
        if (updatedFields.warningThreshold !== undefined) payload.warning_threshold = updatedFields.warningThreshold;

        await supabase
          .from("budgets")
          .update(payload)
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

    if (this.state.user && isSupabaseConfigured() && isValidUUID(id)) {
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
    const id = ruleData.id || `rec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const newRule = {
      ...ruleData,
      id,
      amount: Number(ruleData.amount),
      isPaused: Boolean(ruleData.isPaused),
      status: ruleData.isPaused ? "paused" : "active",
    };

    this.state.recurringRules = [...this.state.recurringRules, newRule];
    this.notify();

    if (this.state.user && isSupabaseConfigured()) {
      const supabase = getSupabaseBrowserClient();
      try {
        const { data: dbRule, error } = await supabase
          .from("recurring_rules")
          .insert({
            user_id: this.state.user.id,
            name: newRule.name,
            type: newRule.type,
            amount: newRule.amount,
            category: newRule.category,
            account_id: isValidUUID(newRule.accountId) ? newRule.accountId : null,
            frequency: newRule.frequency,
            start_date: newRule.startDate,
            next_due_date: newRule.nextDueDate,
            is_paused: newRule.isPaused,
            status: newRule.status,
          })
          .select()
          .single();

        if (error) {
          console.error("Supabase recurring rule insert failed:", error);
          return newRule;
        }

        if (dbRule?.id) {
          this.state.recurringRules = this.state.recurringRules.map((r) =>
            r.id === id ? { ...r, id: dbRule.id } : r
          );
          newRule.id = dbRule.id;
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

    if (this.state.user && isSupabaseConfigured() && isValidUUID(id)) {
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

    if (this.state.user && isSupabaseConfigured() && isValidUUID(id)) {
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

  // --- CLEAR / RESET LEDGER ---
  resetLedger() {
    this.state.accounts = [];
    this.state.transactions = [];
    this.state.budgets = [];
    this.state.recurringRules = [];
    this.state.plannedEvents = [];
    this.state.categories = [...DEFAULT_CATEGORIES];
    if (typeof window !== "undefined") {
      localStorage.removeItem(LEDGER_STORAGE_KEY);
      localStorage.removeItem("daybook_demo_store_v2");
    }
    this.notify();
  }
}

// Global singleton instance
export const store = new DaybookStore();
