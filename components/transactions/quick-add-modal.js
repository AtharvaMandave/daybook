"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { store } from "@/lib/data/storage";
import { validateSplitAllocations } from "@/lib/finance/calculations";
import { Sparkles, Split, Plus, Trash2, ArrowRight } from "lucide-react";

export function QuickAddModal({ open, onOpenChange, editTransaction = null }) {
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [accountId, setAccountId] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [suggestedCategory, setSuggestedCategory] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Split transaction state
  const [isSplit, setIsSplit] = useState(false);
  const [splits, setSplits] = useState([
    { amount: "", category: "", notes: "" },
    { amount: "", category: "", notes: "" },
  ]);

  const appState = store.getState();
  const accounts = appState.accounts.filter((a) => !a.isArchived);
  const categories = appState.categories;

  // Initialize or reset form
  useEffect(() => {
    if (editTransaction) {
      setType(editTransaction.type || "expense");
      setAmount(editTransaction.amount ? String(editTransaction.amount) : "");
      setDescription(editTransaction.description || "");
      setCategory(editTransaction.category || "");
      setAccountId(editTransaction.accountId || accounts[0]?.id || "");
      setFromAccountId(editTransaction.fromAccountId || accounts[0]?.id || "");
      setToAccountId(editTransaction.toAccountId || accounts[1]?.id || "");
      setDate(editTransaction.date || format(new Date(), "yyyy-MM-dd"));
      setPaymentMethod(editTransaction.paymentMethod || "UPI");
      setNotes(editTransaction.notes || "");
      setTags(Array.isArray(editTransaction.tags) ? editTransaction.tags.join(", ") : "");
      setIsSplit(Boolean(editTransaction.isSplit));
      setSplits(
        editTransaction.splits?.length
          ? editTransaction.splits.map((s) => ({ ...s, amount: String(s.amount) }))
          : [
              { amount: "", category: "", notes: "" },
              { amount: "", category: "", notes: "" },
            ]
      );
    } else {
      setType("expense");
      setAmount("");
      setDescription("");
      setCategory(categories[1]?.name || "Groceries");
      setAccountId(accounts[0]?.id || "");
      setFromAccountId(accounts[0]?.id || "");
      setToAccountId(accounts[1]?.id || "");
      setDate(format(new Date(), "yyyy-MM-dd"));
      setPaymentMethod("UPI");
      setNotes("");
      setTags("");
      setIsSplit(false);
      setSplits([
        { amount: "", category: "Groceries", notes: "" },
        { amount: "", category: "Shopping", notes: "" },
      ]);
    }
    setSuggestedCategory(null);
  }, [open, editTransaction]);

  // Deterministic smart category suggestion on description change
  useEffect(() => {
    if (!description || description.trim().length < 2 || isSplit) {
      setSuggestedCategory(null);
      return;
    }
    const suggestion = store.suggestCategory(description);
    if (suggestion && suggestion !== category) {
      setSuggestedCategory(suggestion);
    } else {
      setSuggestedCategory(null);
    }
  }, [description, isSplit, category]);

  const handleAddSplit = () => {
    setSplits([...splits, { amount: "", category: categories[0]?.name || "Other", notes: "" }]);
  };

  const handleRemoveSplit = (index) => {
    if (splits.length <= 2) {
      toast.error("Split transactions must have at least 2 allocations.");
      return;
    }
    setSplits(splits.filter((_, i) => i !== index));
  };

  const handleSplitChange = (index, field, value) => {
    const updated = [...splits];
    updated[index][field] = value;
    setSplits(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount greater than zero.");
      return;
    }

    if (!description.trim()) {
      toast.error("Please provide a description or merchant name.");
      return;
    }

    if (type === "transfer") {
      if (!fromAccountId || !toAccountId) {
        toast.error("Please choose both source and destination accounts.");
        return;
      }
      if (fromAccountId === toAccountId) {
        toast.error("Source and destination accounts must be different.");
        return;
      }
    } else {
      if (!accountId) {
        toast.error("Please choose an account.");
        return;
      }
    }

    // Split validation
    let finalSplits = [];
    if (isSplit && type === "expense") {
      const parsedSplits = splits.map((s) => ({
        amount: parseFloat(s.amount) || 0,
        category: s.category,
        notes: s.notes || "",
      }));

      const validation = validateSplitAllocations(numAmount, parsedSplits);
      if (!validation.isValid) {
        toast.error(validation.message);
        return;
      }
      finalSplits = parsedSplits;
    }

    setIsSubmitting(true);

    const parsedTags = tags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const txPayload = {
      amount: numAmount,
      type,
      description: description.trim(),
      category: isSplit ? "Split Transaction" : category,
      accountId: type === "transfer" ? fromAccountId : accountId,
      fromAccountId: type === "transfer" ? fromAccountId : undefined,
      toAccountId: type === "transfer" ? toAccountId : undefined,
      date,
      paymentMethod,
      notes: notes.trim(),
      tags: parsedTags,
      isSplit: isSplit && type === "expense",
      splits: isSplit && type === "expense" ? finalSplits : [],
    };

    try {
      if (editTransaction) {
        store.updateTransaction(editTransaction.id, txPayload);
        toast.success("Transaction updated successfully.");
      } else {
        const added = store.addTransaction(txPayload);
        toast.success(
          `Recorded ${type === "expense" ? "expense" : type === "income" ? "income" : "transfer"} of ₹${numAmount.toLocaleString("en-IN")}`,
          {
            action: {
              label: "Undo",
              onClick: () => {
                store.deleteTransaction(added.id);
                toast.info("Transaction undone.");
              },
            },
          }
        );
      }
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save transaction.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>
          {editTransaction ? "Edit Transaction" : "Record Transaction"}
        </DialogTitle>
        <DialogClose onClose={() => onOpenChange(false)} />
      </DialogHeader>

      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Transaction Type Segmented Toggle */}
          <div className="grid grid-cols-3 gap-1 rounded-btn border border-border bg-surface-warm p-1">
            <button
              type="button"
              onClick={() => {
                setType("expense");
              }}
              className={`py-1.5 text-xs font-semibold rounded transition-colors ${
                type === "expense"
                  ? "bg-finance-expense text-white shadow-subtle"
                  : "text-foreground hover:bg-surface-muted"
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => {
                setType("income");
                setIsSplit(false);
              }}
              className={`py-1.5 text-xs font-semibold rounded transition-colors ${
                type === "income"
                  ? "bg-forest-500 text-white shadow-subtle"
                  : "text-foreground hover:bg-surface-muted"
              }`}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => {
                setType("transfer");
                setIsSplit(false);
              }}
              className={`py-1.5 text-xs font-semibold rounded transition-colors ${
                type === "transfer"
                  ? "bg-forest-700 text-white shadow-subtle"
                  : "text-foreground hover:bg-surface-muted"
              }`}
            >
              Transfer
            </button>
          </div>

          {/* Amount Input with prominent Rupee sign */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-base font-semibold text-muted-foreground select-none">
                ₹
              </span>
              <input
                type="number"
                step="any"
                min="0.01"
                placeholder="0.00"
                autoFocus
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex h-11 w-full rounded-btn border border-border bg-white pl-8 pr-4 text-xl font-bold tabular-nums text-foreground shadow-subtle focus-visible:outline-none focus-visible:border-forest-500 focus-visible:ring-1 focus-visible:ring-forest-500"
              />
            </div>
          </div>

          {/* Description & Smart Suggestion */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-foreground">
                Description / Merchant
              </label>
              {suggestedCategory && !isSplit && type === "expense" && (
                <button
                  type="button"
                  onClick={() => {
                    setCategory(suggestedCategory);
                    setSuggestedCategory(null);
                  }}
                  className="flex items-center gap-1 text-[11px] font-medium text-forest-700 bg-surface-sage px-2 py-0.5 rounded-full hover:bg-sage-200 transition-colors"
                >
                  <Sparkles className="h-3 w-3 text-forest-600" />
                  <span>Set category: {suggestedCategory}</span>
                </button>
              )}
            </div>
            <Input
              placeholder="e.g. Blinkit, Swiggy, Uber, Tata Power"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {/* Account & Category (or Transfer Accounts) */}
          {type === "transfer" ? (
            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  From Account
                </label>
                <Select
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  required
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (₹{acc.balance.toLocaleString("en-IN")})
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  To Account
                </label>
                <Select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  required
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (₹{acc.balance.toLocaleString("en-IN")})
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Account
                </label>
                <Select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  required
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </Select>
              </div>

              {!isSplit && (
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
                      .filter((c) => (type === "income" ? c.type === "income" : c.type === "expense"))
                      .map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Split Mode Toggle for Expenses */}
          {type === "expense" && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setIsSplit(!isSplit)}
                className="flex items-center gap-1.5 text-xs font-medium text-forest-700 hover:text-forest-800"
              >
                <Split className="h-3.5 w-3.5" />
                <span>{isSplit ? "Cancel Split (Single Category)" : "Split into multiple categories"}</span>
              </button>

              {isSplit && (
                <div className="mt-2 space-y-2 rounded-btn border border-sage-200 bg-surface-sage/30 p-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
                    <span>Divide total (₹{amount || "0"}) across categories</span>
                    <button
                      type="button"
                      onClick={handleAddSplit}
                      className="text-forest-700 font-medium hover:underline flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> Add item
                    </button>
                  </div>

                  {splits.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-28">
                        <Input
                          type="number"
                          placeholder="₹ Amount"
                          value={s.amount}
                          onChange={(e) => handleSplitChange(idx, "amount", e.target.value)}
                          className="h-8 text-xs tabular-nums"
                          required
                        />
                      </div>
                      <div className="flex-1">
                        <Select
                          value={s.category}
                          onChange={(e) => handleSplitChange(idx, "category", e.target.value)}
                          className="h-8 text-xs"
                          required
                        >
                          {categories
                            .filter((c) => c.type === "expense")
                            .map((cat) => (
                              <option key={cat.id} value={cat.name}>
                                {cat.name}
                              </option>
                            ))}
                        </Select>
                      </div>
                      {splits.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSplit(idx)}
                          className="p-1 text-muted-foreground hover:text-finance-expense"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Date & Payment Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Date
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Payment Method
              </label>
              <Select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Net Banking">Net Banking</option>
                <option value="Cash">Cash</option>
                <option value="Auto Debit">Auto Debit / Mandate</option>
              </Select>
            </div>
          </div>

          {/* Notes and Tags */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Tags (comma separated)
              </label>
              <Input
                placeholder="work, trip, groceries"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Notes (optional)
              </label>
              <Input
                placeholder="Optional remark"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="default"
              disabled={isSubmitting}
            >
              {editTransaction ? "Update Transaction" : "Save Transaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
