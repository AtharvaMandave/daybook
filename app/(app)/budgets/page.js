"use client";

import React, { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";
import {
  PieChart,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Trash2,
  Repeat,
  Sparkles,
} from "lucide-react";
import { store } from "@/lib/data/storage";
import { calculateBudgetsProgress } from "@/lib/finance/calculations";
import { formatCurrency } from "@/lib/finance/currency";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";

export default function BudgetsPage() {
  const [appState, setAppState] = useState(store.getState());
  const [isAddBudgetOpen, setIsAddBudgetOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);

  // Form state
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState("");
  const [period, setPeriod] = useState("monthly");
  const [rolloverAmount, setRolloverAmount] = useState("0");
  const [warningThreshold, setWarningThreshold] = useState("80");

  useEffect(() => {
    const unsubscribe = store.subscribe((newState) => {
      setAppState({ ...newState });
    });
    return () => unsubscribe();
  }, []);

  const { budgets, transactions, categories, isPrivateMode } = appState;

  const currentMonthStart = startOfMonth(new Date("2026-10-15"));
  const currentMonthEnd = endOfMonth(new Date("2026-10-15"));

  const budgetProgress = calculateBudgetsProgress(
    budgets,
    transactions,
    currentMonthStart,
    currentMonthEnd
  );

  // Summary statistics
  const totalBudgeted = budgetProgress.reduce((sum, b) => sum + b.effectiveLimit, 0);
  const totalSpent = budgetProgress.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = Math.max(0, totalBudgeted - totalSpent);
  const overallPercentage = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;

  const handleOpenAdd = (b = null) => {
    if (b) {
      setEditingBudget(b);
      setCategory(b.category);
      setLimit(String(b.limit));
      setPeriod(b.period || "monthly");
      setRolloverAmount(String(b.rolloverAmount || 0));
      setWarningThreshold(String(b.warningThreshold || 80));
    } else {
      setEditingBudget(null);
      setCategory(categories.find((c) => c.type === "expense")?.name || "Groceries");
      setLimit("");
      setPeriod("monthly");
      setRolloverAmount("0");
      setWarningThreshold("80");
    }
    setIsAddBudgetOpen(true);
  };

  const handleSaveBudget = (e) => {
    e.preventDefault();
    const numLimit = parseFloat(limit);
    if (isNaN(numLimit) || numLimit <= 0) {
      toast.error("Please enter a valid budget limit greater than zero.");
      return;
    }

    if (!category) {
      toast.error("Please select a category.");
      return;
    }

    const payload = {
      category,
      limit: numLimit,
      period,
      rolloverAmount: parseFloat(rolloverAmount) || 0,
      warningThreshold: parseInt(warningThreshold, 10) || 80,
    };

    if (editingBudget) {
      store.updateBudget(editingBudget.id, payload);
      toast.success(`Updated budget for ${category}.`);
    } else {
      // Check if duplicate category budget exists
      const existing = budgets.find(
        (b) => b.category.toLowerCase() === category.toLowerCase() && b.period === period
      );
      if (existing) {
        toast.error(`A budget for ${category} already exists.`);
        return;
      }
      store.addBudget(payload);
      toast.success(`Created budget for ${category}.`);
    }

    setIsAddBudgetOpen(false);
  };

  const handleDeleteBudget = (id, catName) => {
    if (window.confirm(`Delete budget for ${catName}?`)) {
      store.deleteBudget(id);
      toast.info(`Deleted budget for ${catName}.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            Category Budgets
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Set sensible spending boundaries and track real-time utilization.
          </p>
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={() => handleOpenAdd(null)}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>New Budget</span>
        </Button>
      </div>

      {/* Top Budget Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <p className="text-xs font-medium text-muted-foreground">Total Budget Limit</p>
          <p className="text-2xl font-bold tabular-nums text-foreground mt-1">
            {formatCurrency(totalBudgeted, { isPrivate: isPrivateMode })}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Across {budgets.length} configured categories
          </p>
        </Card>

        <Card>
          <p className="text-xs font-medium text-muted-foreground">Total Spent This Month</p>
          <p className="text-2xl font-bold tabular-nums text-foreground mt-1">
            {formatCurrency(totalSpent, { isPrivate: isPrivateMode })}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {overallPercentage}% of total envelope
          </p>
        </Card>

        <Card>
          <p className="text-xs font-medium text-muted-foreground">Remaining Envelope</p>
          <p className="text-2xl font-bold tabular-nums text-forest-800 mt-1">
            {formatCurrency(totalRemaining, { isPrivate: isPrivateMode })}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Safe to spend across categories
          </p>
        </Card>

        <Card>
          <p className="text-xs font-medium text-muted-foreground">Budget Health</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-bold text-foreground">
              {budgetProgress.filter((b) => b.status === "normal").length} / {budgets.length}
            </span>
            <Badge variant="default" className="text-xs">
              On Track
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {budgetProgress.filter((b) => b.status !== "normal").length} category warnings
          </p>
        </Card>
      </div>

      {/* Category Budgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {budgetProgress.map((b) => (
          <Card key={b.id} className="relative overflow-hidden flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-start justify-between pb-3">
                <div>
                  <h3 className="text-base font-bold text-foreground">{b.category}</h3>
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-mono">
                    {b.period}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenAdd(b)}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface-muted"
                    title="Edit budget"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteBudget(b.id, b.category)}
                    className="p-1 rounded text-muted-foreground hover:text-finance-expense hover:bg-surface-muted"
                    title="Delete budget"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Amounts breakdown */}
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Spent:</span>
                  <span className="font-bold tabular-nums text-foreground">
                    {formatCurrency(b.spent, { isPrivate: isPrivateMode })}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Limit:</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatCurrency(b.effectiveLimit, { isPrivate: isPrivateMode })}
                  </span>
                </div>
                {b.rolloverAmount > 0 && (
                  <div className="flex justify-between text-[11px] text-forest-700">
                    <span>Rollover from last month:</span>
                    <span className="tabular-nums font-medium">
                      +₹{b.rolloverAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="mt-4 space-y-1.5">
                <div className="h-2.5 w-full rounded-full bg-surface-muted overflow-hidden">
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
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium">{b.percentage}% consumed</span>
                  <span className="font-semibold text-foreground">
                    {b.isOverBudget
                      ? `Over by ${formatCurrency(b.overAmount, { isPrivate: isPrivateMode })}`
                      : `${formatCurrency(b.remaining, { isPrivate: isPrivateMode })} left`}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Status Pill */}
            <div className="mt-5 pt-3 border-t border-border flex items-center justify-between">
              {b.status === "exceeded" ? (
                <Badge variant="expense" className="gap-1 text-[11px]">
                  <AlertTriangle className="h-3 w-3" />
                  Budget Exceeded
                </Badge>
              ) : b.status === "warning" ? (
                <Badge variant="warning" className="gap-1 text-[11px]">
                  <AlertTriangle className="h-3 w-3" />
                  Approaching Cap ({b.warningThreshold || 80}%)
                </Badge>
              ) : (
                <Badge variant="income" className="gap-1 text-[11px]">
                  <CheckCircle2 className="h-3 w-3" />
                  Healthy
                </Badge>
              )}

              <span className="text-[11px] text-muted-foreground font-mono">
                {b.isOverBudget ? "Action Needed" : "On Track"}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* CREATE / EDIT BUDGET MODAL */}
      <Dialog open={isAddBudgetOpen} onOpenChange={setIsAddBudgetOpen}>
        <DialogHeader>
          <DialogTitle>
            {editingBudget ? "Edit Category Budget" : "Create Category Budget"}
          </DialogTitle>
          <DialogClose onClose={() => setIsAddBudgetOpen(false)} />
        </DialogHeader>

        <DialogContent>
          <form onSubmit={handleSaveBudget} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Category
              </label>
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                {categories
                  .filter((c) => c.type === "expense")
                  .map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Monthly Spending Limit (₹)
              </label>
              <Input
                type="number"
                placeholder="e.g. 15000"
                min="1"
                step="any"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Rollover from Prior Period (₹)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={rolloverAmount}
                  onChange={(e) => setRolloverAmount(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Alert Threshold (%)
                </label>
                <Input
                  type="number"
                  min="50"
                  max="100"
                  value={warningThreshold}
                  onChange={(e) => setWarningThreshold(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-border flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddBudgetOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="default" size="sm">
                {editingBudget ? "Save Changes" : "Create Budget"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
