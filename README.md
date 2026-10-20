# Daybook — Premium Personal Expense Tracker

> **Know where your money goes.**

Daybook is an editorial, exceptionally usable personal finance application and calculation engine. Designed like a thoughtful fintech product—restrained, organized, human, and beautifully detailed—it provides real financial answers rather than generic AI summaries or crypto dashboards.

---

## 1. Product Capabilities

1. **Dashboard & Financial Posture** (`/dashboard`):
   - **Signature Safe to Spend Engine**: Estimates spendable money remaining until the next configured payday, mathematically reserving upcoming obligations and planned savings. Includes an inspectable calculation breakdown.
   - **Dynamic Net Worth**: Evaluates liquid assets (Checking, Savings, Cash, Digital Wallets) while deducting outstanding credit card liabilities.
   - **Spending Trend**: Recharts daily expenditure visualization with editorial color grading.
   - **Monthly Budgets Snapshot**: Real-time category envelope tracking with threshold alerts.
   - **Recent Transactions Ledger**: Quick access to recent expenses, income, and transfers.

2. **Transaction Management** (`/transactions`):
   - Supports **Expense**, **Income**, and **Transfer** (with distinct source and destination accounts).
   - **Split Transactions**: Allocate a single transaction across multiple categories with strict checksum validation.
   - **Deterministic Smart Category Suggestions**: Automatic category prediction based on merchant history (e.g., Blinkit &rarr; Groceries, Swiggy &rarr; Food & Dining, Tata Power &rarr; Utilities).
   - **Search & Multi-Filter**: Filter by type, category, account, payment method, and search notes or tags.
   - **CSV Import & Export**: PapaParse CSV export and structured CSV import with data preview and duplicate checking.
   - **Undo Action**: Recover from accidental transaction deletion with one-click undo via Sonner toasts.

3. **Category Budgets** (`/budgets`):
   - Category-based monthly spending limits with customizable alert thresholds (e.g. 80%).
   - Rollover support for unspent budgets from previous periods.
   - Split-aware spending tracking without double-counting.
   - Strict accounting rule: Account transfers never count toward spending budgets.

4. **Money Calendar** (`/calendar`):
   - Interactive monthly calendar matrix.
   - Highlights scheduled paydays, upcoming recurring bills, planned expenses (e.g., festival shopping), and recorded transactions.
   - Selected-day agenda panel with direct transaction creation.

5. **Recurring Obligations & Projections** (`/recurring`):
   - Frequencies: Weekly, Bi-weekly, Monthly, Quarterly, and Yearly.
   - Month-end and leap-year safe due date calculations.
   - Normalized monthly burn rate and projected annual cost calculations.
   - Pause, resume, and archive rules.

6. **Accounts & Accounting Rules** (`/accounts`):
   - Checking, Savings, Credit Cards, Cash in Wallet, Digital Wallets, and Investments.
   - Documented accounting conventions:
     - Transfers adjust individual account balances but never inflate income or expense totals.
     - Credit card repayments from checking accounts reduce card debt to zero without duplicate expenditure recording.

7. **Reports & Analytics** (`/reports`):
   - Category spending donut chart with proportional share.
   - Monthly cash flow comparison (Inflow vs Outflow vs Net Savings).
   - Merchant ranking table and largest transaction ledger.
   - Filtered report CSV export.

8. **Visual Privacy Mode**:
   - One-click global toggle (`Eye` icon in header or sidebar) that masks sensitive figures as `••••••` across all pages and charts for public environments.

---

## 2. Technology Stack

- **Framework**: Next.js 14 (App Router) — **JavaScript only (`.js`, `.jsx`), no TypeScript**.
- **Styling**: Tailwind CSS with custom editorial design tokens.
- **Icons**: Lucide React.
- **Charts**: Recharts.
- **Forms & Validation**: React Hook Form with Zod schemas.
- **Dates**: date-fns for time-zone safe and calendar arithmetic.
- **Notifications**: Sonner toasts.
- **CSV Engine**: PapaParse.
- **Backend & Database**: Supabase Auth, Supabase PostgreSQL, and Row Level Security (RLS).
- **Testing**: Vitest unit test suite covering financial calculations.

---

## 3. Design Tokens & Palette

- **Background (Warm Ivory)**: `#F7F5F0`
- **Primary Text**: `#242820`
- **Forest Green (Signature Accent & Primary)**: `#456B50`
- **Muted Terracotta (Secondary & Debt Accent)**: `#DB9475`
- **Pale Sage Surface**: `#E6EDE3`
- **Soft Neutral Borders**: `#E6E3DB`
- **Secondary Text**: `#77786F`
- **Surface White**: `#FFFFFF` / Warm Surface `#FCFBF9`
- **Typography**: Inter / system sans-serif with **tabular numerals** (`tabular-nums`) for currency amounts.

---

## 4. Getting Started Locally

### Prerequisites
- Node.js 18+ (tested on Node.js v22)
- npm 9+

### Installation
```bash
# 1. Clone repository
git clone <repo-url>
cd exp

# 2. Install dependencies
npm install

# 3. Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Environment Variables & Supabase Setup

Daybook features a **dual-mode architecture**:
- **Demo Mode**: If Supabase credentials are not provided, Daybook automatically activates **Demo Mode (INR ₹)** with a rich, realistic Indian personal finance dataset (Salary, Rent, Swiggy, Blinkit, Tata Power, SIPs) and localStorage persistence.
- **Production Mode**: When configured, Daybook connects to Supabase PostgreSQL and Supabase Auth with Row Level Security.

### Setting up Supabase
1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
3. Fill in your project keys:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```
4. Run the database migration:
   - In your Supabase dashboard, go to the **SQL Editor**.
   - Copy the contents of `supabase/migrations/20261015000000_daybook_schema.sql` and run it.
   - This creates tables (`profiles`, `accounts`, `categories`, `transactions`, `transaction_splits`, `budgets`, `recurring_rules`, `planned_events`), performance indexes, and strict user-isolation RLS policies.

---

## 6. Running Tests

Daybook includes a comprehensive financial unit test suite verifying:
- Balance calculations on income and expenses.
- Transfer exclusion from income/expense totals.
- Split transaction allocations and checksum validation.
- Budget usage, rollover limits, and threshold warnings.
- Month-end and leap-year safe recurring date calculations.
- Safe to Spend deduplication of already-paid bills.

Run tests with Vitest:
```bash
npm test
```

Expected output:
```
 ✓ tests/recurring.test.js (4 tests)
 ✓ tests/calculations.test.js (5 tests)
 ✓ tests/safe-to-spend.test.js (6 tests)

 Test Files  3 passed (3)
      Tests  15 passed (15)
```

---

## 7. Production Build & Deployment

### Build Command
```bash
npm run build
npm start
```

### Vercel Deployment
1. Push the code to a GitHub repository.
2. Import the project into [Vercel](https://vercel.com).
3. Set the Framework Preset to **Next.js**.
4. (Optional) Add your Supabase environment variables in the Vercel project settings.
5. Deploy.
# daybook
