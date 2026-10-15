"use client";

import React, { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import Papa from "papaparse";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
  Store,
  Layers,
} from "lucide-react";
import { store } from "@/lib/data/storage";
import {
  calculatePeriodTotals,
  calculateCategoryBreakdown,
} from "@/lib/finance/calculations";
import { formatCurrency } from "@/lib/finance/currency";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const CHART_PALETTE = [
  "#456B50",
  "#DB9475",
  "#3C6E71",
  "#C27A23",
  "#6E8F60",
  "#A65F42",
  "#4F6B72",
  "#B84A39",
  "#2E4A36",
  "#77786F",
];

export default function ReportsPage() {
  const [appState, setAppState] = useState(store.getState());
  const [timeRange, setTimeRange] = useState("oct_2026");

  useEffect(() => {
    const unsubscribe = store.subscribe((newState) => {
      setAppState({ ...newState });
    });
    return () => unsubscribe();
  }, []);

  const { transactions, isPrivateMode } = appState;

  // Selected period interval
  const { periodStart, periodEnd, periodName } = useMemo(() => {
    if (timeRange === "sep_2026") {
      const d = new Date("2026-09-15");
      return {
        periodStart: startOfMonth(d),
        periodEnd: endOfMonth(d),
        periodName: "September 2026",
      };
    }
    // Default: October 2026
    const d = new Date("2026-10-15");
    return {
      periodStart: startOfMonth(d),
      periodEnd: endOfMonth(d),
      periodName: "October 2026",
    };
  }, [timeRange]);

  // Calculations
  const periodTotals = calculatePeriodTotals(transactions, periodStart, periodEnd);
  const categoryBreakdown = calculateCategoryBreakdown(transactions, periodStart, periodEnd);

  // Top Merchants ranking
  const merchantRanking = useMemo(() => {
    const map = {};
    for (const t of transactions) {
      if (t.type !== "expense") continue;
      const tDate = new Date(t.date);
      if (tDate >= periodStart && tDate <= periodEnd) {
        const desc = t.description?.split("-")[0]?.trim() || "Other";
        map[desc] = (map[desc] || 0) + (Number(t.amount) || 0);
      }
    }
    return Object.entries(map)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [transactions, periodStart, periodEnd]);

  // Largest individual transactions
  const largestTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        if (t.type !== "expense") return false;
        const d = new Date(t.date);
        return d >= periodStart && d <= periodEnd;
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [transactions, periodStart, periodEnd]);

  // Income vs Expense comparison bar chart data
  const comparisonData = [
    { name: "Income", amount: periodTotals.totalIncome, fill: "#366E4E" },
    { name: "Expenses", amount: periodTotals.totalExpense, fill: "#B84A39" },
    { name: "Net Flow", amount: Math.max(0, periodTotals.netCashFlow), fill: "#456B50" },
  ];

  const handleExportReportCSV = () => {
    const exportData = categoryBreakdown.map((c) => ({
      Category: c.category,
      TotalSpent: c.total,
      Percentage: `${c.percentage}%`,
      TransactionCount: c.count,
      Period: periodName,
    }));

    const csvString = Papa.unparse(exportData);
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `daybook_report_${timeRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported category report for ${periodName}.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            Financial Reports & Analytics
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Clear visibility into category spending distribution, cash flow trends, and merchant habits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="w-40 h-9 text-xs"
          >
            <option value="oct_2026">October 2026</option>
            <option value="sep_2026">September 2026</option>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportReportCSV}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <span className="text-xs font-medium text-muted-foreground">Total Income</span>
          <p className="text-2xl font-bold tabular-nums text-foreground mt-1">
            {formatCurrency(periodTotals.totalIncome, { isPrivate: isPrivateMode })}
          </p>
          <p className="text-[11px] text-finance-income mt-0.5">Verified incoming cash</p>
        </Card>

        <Card>
          <span className="text-xs font-medium text-muted-foreground">Total Outflow</span>
          <p className="text-2xl font-bold tabular-nums text-foreground mt-1">
            {formatCurrency(periodTotals.totalExpense, { isPrivate: isPrivateMode })}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Across {categoryBreakdown.length} spending categories
          </p>
        </Card>

        <Card>
          <span className="text-xs font-medium text-muted-foreground">Net Cash Flow</span>
          <p className="text-2xl font-bold tabular-nums text-forest-800 mt-1">
            {formatCurrency(periodTotals.netCashFlow, { isPrivate: isPrivateMode, showSign: true })}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Savings rate: {periodTotals.savingsRate}%
          </p>
        </Card>
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown Donut Chart */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Spending by Category</CardTitle>
              <p className="text-xs text-muted-foreground">Distribution for {periodName}</p>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {formatCurrency(periodTotals.totalExpense, { isPrivate: isPrivateMode })}
            </span>
          </CardHeader>

          <div className="h-64 w-full flex items-center justify-center pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="total"
                  nameKey="category"
                >
                  {categoryBreakdown.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_PALETTE[index % CHART_PALETTE.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [
                    isPrivateMode ? "••••••" : `₹${Number(value).toLocaleString("en-IN")}`,
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
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Category legend list */}
          <div className="space-y-1.5 pt-3 border-t border-border max-h-48 overflow-y-auto">
            {categoryBreakdown.map((item, idx) => (
              <div key={item.category} className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: CHART_PALETTE[idx % CHART_PALETTE.length] }}
                  />
                  <span className="text-foreground font-medium">{item.category}</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-muted-foreground">{item.percentage}%</span>
                  <span className="font-bold tabular-nums text-foreground">
                    {formatCurrency(item.total, { isPrivate: isPrivateMode })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Income vs Expense Bar Chart */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Cash Flow Inflow vs Outflow</CardTitle>
              <p className="text-xs text-muted-foreground">Volume comparison for {periodName}</p>
            </div>
            <Badge variant="default" className="text-xs">
              Net +₹{periodTotals.netCashFlow.toLocaleString("en-IN")}
            </Badge>
          </CardHeader>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="name"
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
                  formatter={(val) => [
                    isPrivateMode ? "••••••" : `₹${Number(val).toLocaleString("en-IN")}`,
                    "Amount",
                  ]}
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    borderColor: "#E6E3DB",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px -2px rgba(36, 40, 32, 0.08)",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quick takeaway note */}
          <div className="mt-4 p-3 rounded-btn border border-sage-200 bg-surface-sage/30 text-xs text-forest-800">
            <strong>Observation:</strong> You retained{" "}
            <strong>{periodTotals.savingsRate}%</strong> of your incoming salary this month
            after all household, dining, and utility obligations.
          </div>
        </Card>
      </div>

      {/* Tables: Top Merchants and Largest Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Merchants */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Top Merchants & Beneficiaries</CardTitle>
              <p className="text-xs text-muted-foreground">Where your spending is concentrated</p>
            </div>
            <Store className="h-4 w-4 text-forest-600" />
          </CardHeader>

          <div className="divide-y divide-border pt-1">
            {merchantRanking.map((m, idx) => (
              <div key={idx} className="flex items-center justify-between py-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-surface-muted flex items-center justify-center font-bold text-[10px] text-muted-foreground">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-foreground">{m.name}</span>
                </div>
                <span className="font-bold tabular-nums text-foreground">
                  {formatCurrency(m.total, { isPrivate: isPrivateMode })}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Largest Transactions */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Largest Individual Expenses</CardTitle>
              <p className="text-xs text-muted-foreground">Top expenditure items in this period</p>
            </div>
            <Layers className="h-4 w-4 text-forest-600" />
          </CardHeader>

          <div className="divide-y divide-border pt-1">
            {largestTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2.5 text-xs">
                <div>
                  <p className="font-semibold text-foreground">{tx.description}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {tx.category} • {tx.date}
                  </p>
                </div>
                <span className="font-bold tabular-nums text-finance-expense">
                  -{formatCurrency(tx.amount, { isPrivate: isPrivateMode })}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
