-- Daybook - Premium Personal Expense Tracker
-- Complete Database Schema with PostgreSQL Row Level Security (RLS)

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  currency TEXT DEFAULT 'INR' NOT NULL,
  payday_day_of_month INTEGER DEFAULT 30 CHECK (payday_day_of_month BETWEEN 1 AND 31),
  is_payday_configured BOOLEAN DEFAULT true,
  expected_payday_income NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('checking', 'savings', 'credit', 'cash', 'wallet', 'investment')),
  opening_balance NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  current_balance NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  include_in_net_worth BOOLEAN DEFAULT true NOT NULL,
  is_archived BOOLEAN DEFAULT false NOT NULL,
  color TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  icon TEXT,
  color TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. RECURRING RULES TABLE
CREATE TABLE IF NOT EXISTS public.recurring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL,
  next_due_date DATE NOT NULL,
  end_date DATE,
  is_paused BOOLEAN DEFAULT false NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  from_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  to_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  payment_method TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  is_split BOOLEAN DEFAULT false NOT NULL,
  receipt_url TEXT,
  recurring_rule_id UUID REFERENCES public.recurring_rules(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. TRANSACTION SPLITS TABLE
CREATE TABLE IF NOT EXISTS public.transaction_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. BUDGETS TABLE
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  limit_amount NUMERIC(12, 2) NOT NULL CHECK (limit_amount > 0),
  period TEXT DEFAULT 'monthly' NOT NULL,
  rollover_amount NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  warning_threshold INTEGER DEFAULT 80 CHECK (warning_threshold BETWEEN 50 AND 100),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, category, period)
);

-- 8. PLANNED EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.planned_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'savings')),
  category TEXT,
  is_completed BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON public.transactions(user_id, account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_transaction_splits_tx ON public.transaction_splits(transaction_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_user_due ON public.recurring_rules(user_id, next_due_date);
CREATE INDEX IF NOT EXISTS idx_planned_events_user_date ON public.planned_events(user_id, date);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planned_events ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES FOR PROFILES
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS POLICIES FOR ACCOUNTS
CREATE POLICY "Users can view own accounts" ON public.accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own accounts" ON public.accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own accounts" ON public.accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own accounts" ON public.accounts FOR DELETE USING (auth.uid() = user_id);

-- RLS POLICIES FOR CATEGORIES
CREATE POLICY "Users can view own categories" ON public.categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own categories" ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON public.categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON public.categories FOR DELETE USING (auth.uid() = user_id);

-- RLS POLICIES FOR RECURRING RULES
CREATE POLICY "Users can view own recurring rules" ON public.recurring_rules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recurring rules" ON public.recurring_rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recurring rules" ON public.recurring_rules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recurring rules" ON public.recurring_rules FOR DELETE USING (auth.uid() = user_id);

-- RLS POLICIES FOR TRANSACTIONS
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- RLS POLICIES FOR TRANSACTION SPLITS (Ensures ownership via parent transaction)
CREATE POLICY "Users can view own transaction splits" ON public.transaction_splits
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.transactions WHERE id = transaction_splits.transaction_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can insert own transaction splits" ON public.transaction_splits
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.transactions WHERE id = transaction_splits.transaction_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can update own transaction splits" ON public.transaction_splits
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.transactions WHERE id = transaction_splits.transaction_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can delete own transaction splits" ON public.transaction_splits
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.transactions WHERE id = transaction_splits.transaction_id AND user_id = auth.uid())
  );

-- RLS POLICIES FOR BUDGETS
CREATE POLICY "Users can view own budgets" ON public.budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own budgets" ON public.budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own budgets" ON public.budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own budgets" ON public.budgets FOR DELETE USING (auth.uid() = user_id);

-- RLS POLICIES FOR PLANNED EVENTS
CREATE POLICY "Users can view own planned events" ON public.planned_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own planned events" ON public.planned_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own planned events" ON public.planned_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own planned events" ON public.planned_events FOR DELETE USING (auth.uid() = user_id);
