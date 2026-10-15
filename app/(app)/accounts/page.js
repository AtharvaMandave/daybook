"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Wallet,
  CreditCard,
  Building,
  Coins,
  Plus,
  ArrowRightLeft,
  Edit2,
  Archive,
  Info,
  CheckCircle2,
} from "lucide-react";
import { store } from "@/lib/data/storage";
import { calculateNetWorth } from "@/lib/finance/calculations";
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

export default function AccountsPage() {
  const [appState, setAppState] = useState(store.getState());
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  // Form fields
  const [name, setName] = useState("");
  const [type, setType] = useState("checking");
  const [openingBalance, setOpeningBalance] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [color, setColor] = useState("#456B50");

  useEffect(() => {
    const unsubscribe = store.subscribe((newState) => {
      setAppState({ ...newState });
    });
    return () => unsubscribe();
  }, []);

  const { accounts, isPrivateMode } = appState;
  const activeAccounts = accounts.filter((a) => !a.isArchived);
  const netWorthSummary = calculateNetWorth(accounts);

  const handleOpenAdd = (acc = null) => {
    if (acc) {
      setEditingAccount(acc);
      setName(acc.name);
      setType(acc.type);
      setOpeningBalance(String(acc.openingBalance || 0));
      setAccountNumber(acc.accountNumber || "");
      setColor(acc.color || "#456B50");
    } else {
      setEditingAccount(null);
      setName("");
      setType("checking");
      setOpeningBalance("0");
      setAccountNumber("");
      setColor("#456B50");
    }
    setIsAddAccountOpen(true);
  };

  const handleSaveAccount = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter an account name.");
      return;
    }

    const numBal = parseFloat(openingBalance) || 0;

    if (editingAccount) {
      store.updateAccount(editingAccount.id, {
        name: name.trim(),
        type,
        accountNumber: accountNumber.trim(),
        color,
      });
      toast.success(`Updated account: ${name.trim()}`);
    } else {
      store.addAccount({
        name: name.trim(),
        type,
        openingBalance: numBal,
        balance: numBal,
        accountNumber: accountNumber.trim(),
        color,
      });
      toast.success(`Created account: ${name.trim()}`);
    }

    setIsAddAccountOpen(false);
  };

  const handleArchive = (id, accName) => {
    if (window.confirm(`Archive account "${accName}"? It will no longer appear in active balance totals.`)) {
      store.archiveAccount(id);
      toast.info(`Archived account: ${accName}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            Accounts & Net Worth
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Manage your bank accounts, credit cards, cash in hand, and investment ledgers.
          </p>
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={() => handleOpenAdd(null)}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>Add Account</span>
        </Button>
      </div>

      {/* Net Worth Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-surface-sage/30 border-sage-200">
          <p className="text-xs font-semibold text-forest-800">Total Net Worth</p>
          <p className="text-2xl font-extrabold tabular-nums text-forest-900 mt-1">
            {formatCurrency(netWorthSummary.totalNetWorth, { isPrivate: isPrivateMode })}
          </p>
          <p className="text-[11px] text-forest-700 mt-0.5">
            Liquid Available Funds minus Outstanding Debt
          </p>
        </Card>

        <Card>
          <p className="text-xs font-medium text-muted-foreground">Total Liquid Assets</p>
          <p className="text-2xl font-bold tabular-nums text-foreground mt-1">
            {formatCurrency(netWorthSummary.liquidBalance, { isPrivate: isPrivateMode })}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Bank accounts, checking, savings, and physical cash
          </p>
        </Card>

        <Card>
          <p className="text-xs font-medium text-muted-foreground">Credit Card Liabilities</p>
          <p className="text-2xl font-bold tabular-nums text-terracotta-700 mt-1">
            {formatCurrency(netWorthSummary.totalDebt, { isPrivate: isPrivateMode })}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Total unpaid credit card balances across cards
          </p>
        </Card>
      </div>

      {/* Accounts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeAccounts.map((acc) => {
          const isCredit = acc.type === "credit";
          return (
            <Card key={acc.id} className="relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center text-white shadow-subtle"
                    style={{ backgroundColor: acc.color || "#456B50" }}
                  >
                    {isCredit ? (
                      <CreditCard className="h-5 w-5" />
                    ) : acc.type === "cash" ? (
                      <Coins className="h-5 w-5" />
                    ) : (
                      <Building className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{acc.name}</h3>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      {acc.accountNumber || (isCredit ? "Credit Line" : "Deposit A/C")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenAdd(acc)}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface-muted"
                    title="Edit account"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleArchive(acc.id, acc.name)}
                    className="p-1 rounded text-muted-foreground hover:text-finance-expense hover:bg-surface-muted"
                    title="Archive account"
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Balance */}
              <div className="mt-4 pt-3 border-t border-border flex items-end justify-between">
                <div>
                  <span className="text-[11px] text-muted-foreground">
                    {isCredit ? "Outstanding Balance (Owed)" : "Current Balance"}
                  </span>
                  <p
                    className={`text-xl font-bold tabular-nums ${
                      isCredit
                        ? acc.balance < 0
                          ? "text-terracotta-700"
                          : "text-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {formatCurrency(isCredit ? Math.abs(acc.balance) : acc.balance, {
                      isPrivate: isPrivateMode,
                    })}
                  </p>
                </div>

                <Badge
                  variant={isCredit ? "terracotta" : "default"}
                  className="capitalize text-[11px]"
                >
                  {acc.type}
                </Badge>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Accounting Conventions Reference Note */}
      <div className="rounded-card border border-border bg-surface-warm p-4 flex items-start gap-3">
        <Info className="h-4 w-4 text-forest-700 mt-0.5 shrink-0" />
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">Daybook Accounting Conventions:</p>
          <p>
            1. <strong>Transfers</strong>: Moving money between your bank and credit card (or between savings accounts)
            adjusts individual account balances but is strictly excluded from income and expense calculations.
          </p>
          <p>
            2. <strong>Credit Card Repayments</strong>: When you transfer money from your Checking account to your Credit Card,
            your bank balance decreases and your card liability is reduced to zero. It does not count as duplicate spending.
          </p>
        </div>
      </div>

      {/* CREATE / EDIT ACCOUNT MODAL */}
      <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
        <DialogHeader>
          <DialogTitle>
            {editingAccount ? "Edit Financial Account" : "Add Financial Account"}
          </DialogTitle>
          <DialogClose onClose={() => setIsAddAccountOpen(false)} />
        </DialogHeader>

        <DialogContent>
          <form onSubmit={handleSaveAccount} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Account Name
              </label>
              <Input
                placeholder="e.g. HDFC Salary, ICICI Emergency, Axis Credit Card"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Account Type
                </label>
                <Select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  disabled={Boolean(editingAccount)}
                >
                  <option value="checking">Checking / Salary A/C</option>
                  <option value="savings">Savings A/C</option>
                  <option value="credit">Credit Card</option>
                  <option value="cash">Cash in Wallet</option>
                  <option value="wallet">Digital Wallet</option>
                  <option value="investment">Investment / Demat</option>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Opening Balance (₹)
                </label>
                <Input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  disabled={Boolean(editingAccount)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Account Number / Tag (optional)
                </label>
                <Input
                  placeholder="e.g. •••• 4892"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Accent Color
                </label>
                <div className="flex items-center gap-2 mt-1">
                  {["#456B50", "#3C6E71", "#DB9475", "#A65F42", "#77786F", "#2E4A36"].map(
                    (hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setColor(hex)}
                        className={`h-6 w-6 rounded-full border-2 transition-transform ${
                          color === hex ? "border-foreground scale-110" : "border-transparent"
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddAccountOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="default" size="sm">
                {editingAccount ? "Save Changes" : "Create Account"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
