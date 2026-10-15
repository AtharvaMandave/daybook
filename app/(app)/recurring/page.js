"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Repeat,
  Plus,
  Play,
  Pause,
  Trash2,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { store } from "@/lib/data/storage";
import {
  calculateAnnualCost,
  calculateMonthlyEquivalent,
  FREQUENCY_LABELS,
} from "@/lib/finance/recurring";
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

export default function RecurringPage() {
  const [appState, setAppState] = useState(store.getState());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("");
  const [accountId, setAccountId] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [nextDueDate, setNextDueDate] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    const unsubscribe = store.subscribe((newState) => {
      setAppState({ ...newState });
    });
    return () => unsubscribe();
  }, []);

  const { recurringRules, accounts, categories, isPrivateMode } = appState;

  // Monthly and Annual cost sums
  const activeExpenseRules = recurringRules.filter((r) => r.type === "expense" && !r.isPaused);
  const activeIncomeRules = recurringRules.filter((r) => r.type === "income" && !r.isPaused);

  const totalMonthlyCommitment = activeExpenseRules.reduce(
    (sum, r) => sum + calculateMonthlyEquivalent(r.amount, r.frequency),
    0
  );
  const totalAnnualCommitment = activeExpenseRules.reduce(
    (sum, r) => sum + calculateAnnualCost(r.amount, r.frequency),
    0
  );
  const totalMonthlyIncome = activeIncomeRules.reduce(
    (sum, r) => sum + calculateMonthlyEquivalent(r.amount, r.frequency),
    0
  );

  const handleOpenAdd = () => {
    setName("");
    setAmount("");
    setType("expense");
    setCategory(categories.find((c) => c.type === "expense")?.name || "Subscriptions & Entertainment");
    setAccountId(accounts[0]?.id || "");
    setFrequency("monthly");
    setStartDate(format(new Date(), "yyyy-MM-dd"));
    setNextDueDate(format(new Date(), "yyyy-MM-dd"));
    setIsAddModalOpen(true);
  };

  const handleSaveRule = (e) => {
    e.preventDefault();
    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    if (!name.trim()) {
      toast.error("Please provide a name for this recurring rule.");
      return;
    }

    store.addRecurringRule({
      name: name.trim(),
      amount: numAmt,
      type,
      category,
      accountId,
      frequency,
      startDate,
      nextDueDate,
    });

    toast.success(`Created recurring schedule for ${name.trim()}.`);
    setIsAddModalOpen(false);
  };

  const handleTogglePause = (id, ruleName, isPaused) => {
    store.togglePauseRecurringRule(id);
    toast.info(`${isPaused ? "Resumed" : "Paused"} recurring rule: ${ruleName}`);
  };

  const handleDeleteRule = (id, ruleName) => {
    if (window.confirm(`Delete recurring rule "${ruleName}"?`)) {
      store.deleteRecurringRule(id);
      toast.info(`Deleted recurring rule: ${ruleName}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            Recurring Payments & Subscriptions
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Keep track of fixed obligations, scheduled subscriptions, EMIs, and routine income.
          </p>
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={handleOpenAdd}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>New Recurring Rule</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Monthly Obligations</span>
            <TrendingDown className="h-4 w-4 text-finance-expense" />
          </div>
          <p className="text-2xl font-bold tabular-nums text-foreground mt-2">
            {formatCurrency(totalMonthlyCommitment, { isPrivate: isPrivateMode })}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Normalized monthly burn for {activeExpenseRules.length} active bills
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Projected Annual Cost</span>
            <Calendar className="h-4 w-4 text-forest-600" />
          </div>
          <p className="text-2xl font-bold tabular-nums text-foreground mt-2">
            {formatCurrency(totalAnnualCommitment, { isPrivate: isPrivateMode })}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Annualized total across all frequencies
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Expected Recurring Income</span>
            <TrendingUp className="h-4 w-4 text-finance-income" />
          </div>
          <p className="text-2xl font-bold tabular-nums text-finance-income mt-2">
            {formatCurrency(totalMonthlyIncome, { isPrivate: isPrivateMode })}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Predictable incoming cash flow / month
          </p>
        </Card>
      </div>

      {/* Recurring Rules List */}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-surface-warm flex items-center justify-between">
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">
            All Recurring Rules ({recurringRules.length})
          </span>
          <span className="text-xs text-muted-foreground">
            Automatic schedule calculation
          </span>
        </div>

        <div className="divide-y divide-border">
          {recurringRules.map((rule) => {
            const acc = accounts.find((a) => a.id === rule.accountId);
            const monthlyEquiv = calculateMonthlyEquivalent(rule.amount, rule.frequency);
            const annualCost = calculateAnnualCost(rule.amount, rule.frequency);

            return (
              <div
                key={rule.id}
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-warm/50 transition-colors ${
                  rule.isPaused ? "opacity-60 bg-surface-muted/20" : ""
                }`}
              >
                {/* Left: Info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{rule.name}</span>
                    <Badge
                      variant={rule.type === "income" ? "income" : "outline"}
                      className="text-[10px]"
                    >
                      {FREQUENCY_LABELS[rule.frequency] || rule.frequency}
                    </Badge>
                    {rule.isPaused && (
                      <Badge variant="warning" className="text-[10px]">
                        Paused
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{rule.category}</span>
                    <span>•</span>
                    <span>Account: {acc?.name || "Default Account"}</span>
                    <span>•</span>
                    <span className="font-mono">Next Due: {rule.nextDueDate}</span>
                  </div>
                </div>

                {/* Right: Amounts & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums text-foreground">
                      {formatCurrency(rule.amount, { isPrivate: isPrivateMode })}
                      <span className="text-xs font-normal text-muted-foreground">
                        {" "}
                        / {rule.frequency === "monthly" ? "mo" : rule.frequency}
                      </span>
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      ~{formatCurrency(monthlyEquiv, { isPrivate: isPrivateMode })}/mo •{" "}
                      {formatCurrency(annualCost, { isPrivate: isPrivateMode })}/yr
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleTogglePause(rule.id, rule.name, rule.isPaused)}
                      className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-muted"
                      title={rule.isPaused ? "Resume schedule" : "Pause schedule"}
                    >
                      {rule.isPaused ? (
                        <Play className="h-4 w-4 text-forest-700" />
                      ) : (
                        <Pause className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id, rule.name)}
                      className="p-1.5 rounded text-muted-foreground hover:text-finance-expense hover:bg-surface-muted"
                      title="Delete rule"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* CREATE RECURRING RULE MODAL */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogHeader>
          <DialogTitle>Add Recurring Schedule</DialogTitle>
          <DialogClose onClose={() => setIsAddModalOpen(false)} />
        </DialogHeader>
        <DialogContent>
          <form onSubmit={handleSaveRule} className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-btn border border-border bg-surface-warm p-1">
              <button
                type="button"
                onClick={() => setType("expense")}
                className={`py-1 text-xs font-semibold rounded ${
                  type === "expense" ? "bg-finance-expense text-white" : "text-foreground"
                }`}
              >
                Expense Bill
              </button>
              <button
                type="button"
                onClick={() => setType("income")}
                className={`py-1 text-xs font-semibold rounded ${
                  type === "income" ? "bg-forest-500 text-white" : "text-foreground"
                }`}
              >
                Recurring Income
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Rule Name
              </label>
              <Input
                placeholder="e.g. Apartment Rent, Spotify, Electricity"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Expected Amount (₹)
                </label>
                <Input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="2500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Frequency
                </label>
                <Select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Every 2 Weeks</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Every 3 Months</option>
                  <option value="yearly">Yearly</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Category
                </label>
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Associated Account
                </label>
                <Select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  required
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Next Due Date
                </label>
                <Input
                  type="date"
                  value={nextDueDate}
                  onChange={(e) => setNextDueDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="pt-3 border-t border-border flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="default" size="sm">
                Save Schedule
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
