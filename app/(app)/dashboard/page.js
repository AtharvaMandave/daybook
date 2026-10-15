"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Info,
  ChevronRight,
  AlertTriangle,
  Wallet,
  Sparkles,
  CreditCard,
  CheckCircle2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { store } from "@/lib/data/storage";
import {
  calculateNetWorth,
  calculatePeriodTotals,
  calculateBudgetsProgress,
} from "@/lib/finance/calculations";
import { calculateSafeToSpend } from "@/lib/finance/safe-to-spend";
import { formatCurrency, formatSignedAmount } from "@/lib/finance/currency";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";

export default function DashboardPage() {
  const [appState, setAppState] = useState(store.getState());
  const [showSafeToSpendModal, setShowSafeToSpendModal] = useState(false);

  useEffect(() => {
    const unsubscribe = store.subscribe((newState) => {
      setAppState({ ...newState });
    });
    return () => unsubscribe();
  }, []);

  const {
    profile,
    accounts,
    budgets,
    recurringRules,
    plannedEvents,
    transactions,
    isPrivateMode,
  } = appState;

  // Dynamic Reference Date (October 2026 for demo timeline, real date for live cloud user)
  const referenceDate = appState.isDemoMode
    ? new Date("2026-10-15T12:00:00")
    : new Date();
  const currentMonthStart = startOfMonth(referenceDate);
  const currentMonthEnd = endOfMonth(referenceDate);

  // 1. Net worth & liquid balances
  const netWorthSummary = calculateNetWorth(accounts);

  // 2. Period totals (transfers strictly excluded!)
  const periodTotals = calculatePeriodTotals(
    transactions,
    currentMonthStart,
    currentMonthEnd
  );

  // 3. Safe to Spend signature calculation
  const safeToSpendData = calculateSafeToSpend({
    accounts,
    paydayConfig: {
      isConfigured: profile?.isPaydayConfigured !== false,
      dayOfMonth: profile?.paydayDayOfMonth || 30,
      expectedPaydayIncome: profile?.expectedPaydayIncome || 0,
    },
    recurringBills: recurringRules || [],
    plannedSavings: appState.isDemoMode ? [{ amount: 15000, name: "Index Fund SIP" }] : [],
    recordedTransactions: transactions,
    referenceDate,
  });

  // 4. Budget Progress
  const budgetProgress = calculateBudgetsProgress(
    budgets || [],
    transactions || [],
    currentMonthStart,
    currentMonthEnd
  );

  // 5. Daily spending trend data
  const chartData = appState.isDemoMode
    ? [
        { date: "Oct 1", spent: 4200 },
        { date: "Oct 3", spent: 499 },
        { date: "Oct 5", spent: 3990 },
        { date: "Oct 7", spent: 1499 },
        { date: "Oct 9", spent: 850 },
        { date: "Oct 10", spent: 0 },
        { date: "Oct 12", spent: 3200 },
        { date: "Oct 14", spent: 2390 },
        { date: "Oct 15", spent: 649 },
      ]
    : transactions.length > 0
    ? Object.entries(
        transactions
          .filter((t) => t.type === "expense")
          .reduce((acc, t) => {
            const key = t.date?.slice(5) || "Today";
            acc[key] = (acc[key] || 0) + Number(t.amount);
            return acc;
          }, {})
      ).map(([date, spent]) => ({ date, spent }))
    : [
        { date: "Start", spent: 0 },
        { date: "Today", spent: 0 },
      ];

  // 6. Recent transactions (latest 5)
  const recentTransactions = (transactions || []).slice(0, 5);

  // 7. Upcoming payments from recurring and planned events
  const upcomingPayments = (safeToSpendData?.upcomingItems || []).slice(0, 4);

  // User display name
  const firstName = profile?.fullName
    ? profile.fullName.trim().split(" ")[0]
    : appState.user?.email
    ? appState.user.email.split("@")[0]
    : "Friend";

  return (
    <div className="space-y-6">
      {/* Editorial Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            Welcome back, {firstName}
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            You have{" "}
            <span className="font-semibold text-foreground">
              {safeToSpendData.daysUntilPayday ?? 15} days
            </span>{" "}
            until next payday on {safeToSpendData.nextPayday || "the 30th"}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={appState.isDemoMode ? "default" : "income"} className="text-xs py-1">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                appState.isDemoMode ? "bg-forest-600 animate-pulse" : "bg-emerald-600 animate-pulse"
              }`}
            />
            {appState.isDemoMode ? "Demo Financial Engine" : "Cloud Ledger Active"}
          </Badge>
        </div>
      </div>

      {/* Top Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Liquid Balance */}
        <Card className="bg-white">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Liquid Balance</span>
            <Wallet className="h-4 w-4 text-forest-600" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {formatCurrency(netWorthSummary.liquidBalance, { isPrivate: isPrivateMode })}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Net Worth:{" "}
              <span className="font-semibold text-foreground">
                {formatCurrency(netWorthSummary.totalNetWorth, { isPrivate: isPrivateMode })}
              </span>
            </p>
          </div>
        </Card>

        {/* SIGNATURE CARD: Safe to Spend */}
        <Card className="relative overflow-hidden border-forest-500/30 bg-surface-sage/40">
          <div className="flex items-center justify-between text-forest-800">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold">Safe to Spend</span>
              <button
                onClick={() => setShowSafeToSpendModal(true)}
                className="text-forest-700 hover:text-forest-900"
                title="Inspect how Safe to Spend is calculated"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </div>
            <Badge variant="default" className="text-[10px] bg-white border-sage-200">
              Until {safeToSpendData.nextPayday ? safeToSpendData.nextPayday.split(",")[0] : "Payday"}
            </Badge>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-extrabold tabular-nums text-forest-900">
              {formatCurrency(safeToSpendData.safeToSpend, { isPrivate: isPrivateMode })}
            </p>
            <div className="flex items-center justify-between mt-1 text-[11px] text-forest-700 font-medium">
              <span>
                {formatCurrency(safeToSpendData.dailySafeToSpend, { isPrivate: isPrivateMode })} / day
              </span>
              <button
                onClick={() => setShowSafeToSpendModal(true)}
                className="underline hover:text-forest-900 font-medium"
              >
                Inspect &rarr;
              </button>
            </div>
          </div>
        </Card>

        {/* Monthly Income */}
        <Card className="bg-white">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Monthly Income</span>
            <ArrowDownRight className="h-4 w-4 text-finance-income" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {formatCurrency(periodTotals.totalIncome, { isPrivate: isPrivateMode })}
            </p>
            <p className="text-[11px] text-finance-income mt-1 font-medium">
              {periodTotals.totalIncome > 0
                ? `+₹${periodTotals.totalIncome.toLocaleString("en-IN")} recorded inflow`
                : "No income recorded this period"}
            </p>
          </div>
        </Card>

        {/* Monthly Expenses */}
        <Card className="bg-white">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Monthly Spending</span>
            <ArrowUpRight className="h-4 w-4 text-finance-expense" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {formatCurrency(periodTotals.totalExpense, { isPrivate: isPrivateMode })}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Net Flow:{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {formatCurrency(periodTotals.netCashFlow, { isPrivate: isPrivateMode, showSign: true })}
              </span>
            </p>
          </div>
        </Card>
      </div>

      {/* Main Grid: Spending Trend & Budgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spending Trend Chart (2 cols) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Spending Trend</CardTitle>
              <p className="text-xs text-muted-foreground">
                Daily expenditure across October 2026
              </p>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              Total: {formatCurrency(periodTotals.totalExpense, { isPrivate: isPrivateMode })}
            </span>
          </CardHeader>
          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendingGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#456B50" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#456B50" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={{ stroke: "#E6E3DB" }}
                  tick={{ fill: "#77786F", fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#77786F", fontSize: 11 }}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip
                  formatter={(value) => [
                    isPrivateMode ? "••••••" : `₹${value.toLocaleString("en-IN")}`,
                    "Spent",
                  ]}
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    borderColor: "#E6E3DB",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px -2px rgba(36, 40, 32, 0.08)",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="spent"
                  stroke="#456B50"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#spendingGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Budget Progress (1 col) */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Monthly Budgets</CardTitle>
              <p className="text-xs text-muted-foreground">Category limits & usage</p>
            </div>
            <Link
              href="/budgets"
              className="text-xs font-medium text-forest-700 hover:text-forest-900"
            >
              View All &rarr;
            </Link>
          </CardHeader>
          <div className="space-y-4 pt-2">
            {budgetProgress.slice(0, 4).map((b) => (
              <div key={b.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{b.category}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="tabular-nums font-semibold text-foreground">
                      {formatCurrency(b.spent, { isPrivate: isPrivateMode })}
                    </span>
                    <span className="text-muted-foreground">
                      / {formatCurrency(b.effectiveLimit, { isPrivate: isPrivateMode })}
                    </span>
                    {b.status === "warning" && (
                      <AlertTriangle className="h-3 w-3 text-finance-warning" />
                    )}
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      b.status === "exceeded"
                        ? "bg-finance-expense"
                        : b.status === "warning"
                        ? "bg-finance-warning"
                        : "bg-forest-500"
                    }`}
                    style={{ width: `${Math.min(100, b.percentage)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>{b.percentage}% used</span>
                  <span>
                    {formatCurrency(b.remaining, { isPrivate: isPrivateMode })} left
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom Grid: Recent Transactions & Upcoming Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions Table/List (2 cols) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <p className="text-xs text-muted-foreground">
                Latest transactions recorded in your ledger
              </p>
            </div>
            <Link
              href="/transactions"
              className="text-xs font-medium text-forest-700 hover:text-forest-900"
            >
              All Transactions &rarr;
            </Link>
          </CardHeader>

          <div className="divide-y divide-border pt-1">
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-3 hover:bg-surface-warm/50 px-2 rounded transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                      tx.type === "expense"
                        ? "bg-finance-expenseBg text-finance-expense"
                        : tx.type === "income"
                        ? "bg-finance-incomeBg text-finance-income"
                        : "bg-finance-transferBg text-finance-transfer"
                    }`}
                  >
                    {tx.type === "expense" ? "↓" : tx.type === "income" ? "↑" : "⇄"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{tx.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{tx.category || "Transfer"}</span>
                      <span>•</span>
                      <span>{tx.date}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      tx.type === "expense"
                        ? "text-foreground"
                        : tx.type === "income"
                        ? "text-finance-income"
                        : "text-muted-foreground"
                    }`}
                  >
                    {formatSignedAmount(tx.amount, tx.type, isPrivateMode)}
                  </span>
                  <p className="text-[11px] text-muted-foreground">{tx.paymentMethod}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Upcoming Obligations & Bills (1 col) */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Upcoming Payments</CardTitle>
              <p className="text-xs text-muted-foreground">
                Reserved before payday on Oct 30
              </p>
            </div>
            <Link
              href="/recurring"
              className="text-xs font-medium text-forest-700 hover:text-forest-900"
            >
              Recurring &rarr;
            </Link>
          </CardHeader>

          <div className="space-y-3 pt-2">
            {upcomingPayments.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No upcoming bills due before your next payday.
              </p>
            ) : (
              upcomingPayments.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-btn border border-border bg-surface-warm"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-foreground">{item.title}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>Due {item.dueDate}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold tabular-nums text-foreground">
                      {formatCurrency(item.amount, { isPrivate: isPrivateMode })}
                    </p>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                      Reserved
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* INSPECTABLE SAFE TO SPEND CALCULATION MODAL */}
      <Dialog open={showSafeToSpendModal} onOpenChange={setShowSafeToSpendModal}>
        <DialogHeader>
          <DialogTitle>Safe to Spend Engine Breakdown</DialogTitle>
          <DialogClose onClose={() => setShowSafeToSpendModal(false)} />
        </DialogHeader>
        <DialogContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Daybook uses real balance records, scheduled obligations, and planned savings
            to estimate your spending headroom until your next payday.
          </p>

          <div className="rounded-card border border-border bg-surface-warm p-4 space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground">Liquid Available Funds:</span>
              <span className="font-semibold tabular-nums text-foreground">
                +₹{safeToSpendData.breakdown.liquidBalance.toLocaleString("en-IN")}
              </span>
            </div>
            {safeToSpendData.breakdown.creditCardDue > 0 && (
              <div className="flex justify-between py-1 border-b border-border/60 text-terracotta-700">
                <span>Outstanding Credit Liabilities:</span>
                <span className="font-semibold tabular-nums">
                  -₹{safeToSpendData.breakdown.creditCardDue.toLocaleString("en-IN")}
                </span>
              </div>
            )}
            <div className="flex justify-between py-1 border-b border-border/60 text-finance-expense">
              <span>Upcoming Bills before Oct 30:</span>
              <span className="font-semibold tabular-nums">
                -₹{safeToSpendData.breakdown.upcomingObligations.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/60 text-terracotta-700">
              <span>Planned Savings Commitments:</span>
              <span className="font-semibold tabular-nums">
                -₹{safeToSpendData.breakdown.plannedSavings.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex justify-between pt-2 text-sm font-bold text-forest-800">
              <span>Remaining Safe to Spend:</span>
              <span className="tabular-nums">
                ₹{safeToSpendData.safeToSpend.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-foreground mb-1.5">Calculation Assumptions:</h4>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              {safeToSpendData.assumptions.map((assump, i) => (
                <li key={i}>{assump}</li>
              ))}
            </ul>
          </div>

          <div className="pt-2 border-t border-border flex justify-end">
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowSafeToSpendModal(false)}
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
