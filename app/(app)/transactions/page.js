"use client";

import React, { useState, useEffect, useMemo } from "react";
import { format, parseISO } from "date-fns";
import Papa from "papaparse";
import { toast } from "sonner";
import {
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  ArrowUpDown,
  MoreVertical,
  Trash2,
  Edit2,
  Copy,
  Split,
  FileText,
  X,
  CheckCircle2,
} from "lucide-react";
import { store } from "@/lib/data/storage";
import { formatCurrency, formatSignedAmount } from "@/lib/finance/currency";
import { Card } from "@/components/ui/card";
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
import { QuickAddModal } from "@/components/transactions/quick-add-modal";

export default function TransactionsPage() {
  const [appState, setAppState] = useState(store.getState());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [sortField, setSortField] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");

  // Modals state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [inspectingSplitTx, setInspectingSplitTx] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importedRows, setImportedRows] = useState([]);

  useEffect(() => {
    const unsubscribe = store.subscribe((newState) => {
      setAppState({ ...newState });
    });
    return () => unsubscribe();
  }, []);

  const { transactions, accounts, categories, isPrivateMode } = appState;

  // Filter & Search
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Type filter
      if (selectedType !== "all" && t.type !== selectedType) return false;

      // Category filter
      if (selectedCategory !== "all") {
        if (t.isSplit && Array.isArray(t.splits)) {
          const hasCat = t.splits.some((s) => s.category === selectedCategory);
          if (!hasCat) return false;
        } else if (t.category !== selectedCategory) {
          return false;
        }
      }

      // Account filter
      if (selectedAccount !== "all") {
        if (t.type === "transfer") {
          if (t.fromAccountId !== selectedAccount && t.toAccountId !== selectedAccount) {
            return false;
          }
        } else if (t.accountId !== selectedAccount) {
          return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const desc = (t.description || "").toLowerCase();
        const cat = (t.category || "").toLowerCase();
        const notes = (t.notes || "").toLowerCase();
        const tags = Array.isArray(t.tags) ? t.tags.join(" ").toLowerCase() : "";
        const matches = desc.includes(query) || cat.includes(query) || notes.includes(query) || tags.includes(query);
        if (!matches) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortField === "date") {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
      } else if (sortField === "amount") {
        return sortOrder === "desc" ? b.amount - a.amount : a.amount - b.amount;
      }
      return 0;
    });
  }, [transactions, selectedType, selectedCategory, selectedAccount, searchQuery, sortField, sortOrder]);

  // Totals for filtered transactions
  const filteredTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of filteredTransactions) {
      if (t.type === "income") income += Number(t.amount) || 0;
      if (t.type === "expense") expense += Number(t.amount) || 0;
    }
    return {
      income,
      expense,
      net: income - expense,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  // Actions
  const handleDelete = (id) => {
    const deleted = transactions.find((t) => t.id === id);
    if (!deleted) return;

    if (window.confirm(`Delete transaction "${deleted.description}"?`)) {
      store.deleteTransaction(id);
      toast.info(`Deleted ${deleted.description}`, {
        action: {
          label: "Undo",
          onClick: () => {
            store.undoLastDelete();
            toast.success("Restored deleted transaction.");
          },
        },
      });
    }
  };

  const handleDuplicate = (tx) => {
    const duplicated = {
      ...tx,
      id: undefined,
      description: `${tx.description} (Copy)`,
      date: format(new Date(), "yyyy-MM-dd"),
    };
    store.addTransaction(duplicated);
    toast.success("Duplicated transaction successfully.");
  };

  const handleExportCSV = () => {
    const csvData = filteredTransactions.map((t) => ({
      Date: t.date,
      Type: t.type,
      Description: t.description,
      Category: t.category || "",
      Amount: t.amount,
      PaymentMethod: t.paymentMethod || "",
      Notes: t.notes || "",
      Tags: Array.isArray(t.tags) ? t.tags.join(";") : "",
    }));

    const csvString = Papa.unparse(csvData);
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `daybook_transactions_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${csvData.length} transactions to CSV.`);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          setImportedRows(results.data);
          setIsImportModalOpen(true);
        } else {
          toast.error("CSV file is empty or could not be parsed.");
        }
      },
    });
  };

  const handleConfirmImport = () => {
    let successCount = 0;
    const defaultAccId = accounts[0]?.id;

    for (const row of importedRows) {
      const rawAmt = parseFloat(row.Amount || row.amount);
      const rawDesc = row.Description || row.description || row.Merchant || "Imported Transaction";
      const rawType = (row.Type || row.type || "expense").toLowerCase();
      const rawDate = row.Date || row.date || format(new Date(), "yyyy-MM-dd");
      const rawCat = row.Category || row.category || "Other";

      if (!isNaN(rawAmt) && rawAmt > 0) {
        store.addTransaction({
          amount: rawAmt,
          description: rawDesc,
          type: ["expense", "income", "transfer"].includes(rawType) ? rawType : "expense",
          date: rawDate,
          category: rawCat,
          accountId: defaultAccId,
          paymentMethod: "Import",
        });
        successCount++;
      }
    }

    toast.success(`Successfully imported ${successCount} transactions.`);
    setIsImportModalOpen(false);
    setImportedRows([]);
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedType("all");
    setSelectedCategory("all");
    setSelectedAccount("all");
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            Transactions Ledger
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Complete record of income, expenses, and account transfers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* CSV Import */}
          <label className="flex items-center gap-1.5 h-9 px-3 text-xs font-medium rounded-btn border border-border bg-white hover:bg-surface-muted text-foreground cursor-pointer shadow-subtle">
            <Upload className="h-3.5 w-3.5" />
            <span>Import</span>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>

          {/* CSV Export */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-1.5"
            title="Download CSV report"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export</span>
          </Button>

          {/* Add Transaction */}
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setEditingTransaction(null);
              setIsQuickAddOpen(true);
            }}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Add Transaction</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search description, tag, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Type Filter */}
          <Select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="expense">Expenses Only</option>
            <option value="income">Income Only</option>
            <option value="transfer">Transfers Only</option>
          </Select>

          {/* Category Filter */}
          <Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </Select>

          {/* Account Filter */}
          <Select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
          >
            <option value="all">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Filter Summary & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60 text-xs">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
            <span>
              Showing <strong className="text-foreground">{filteredTotals.count}</strong> transactions
            </span>
            <span className="hidden sm:inline">•</span>
            <span>
              Inflow:{" "}
              <strong className="text-finance-income tabular-nums">
                {formatCurrency(filteredTotals.income, { isPrivate: isPrivateMode })}
              </strong>
            </span>
            <span className="hidden sm:inline">•</span>
            <span>
              Outflow:{" "}
              <strong className="text-finance-expense tabular-nums">
                {formatCurrency(filteredTotals.expense, { isPrivate: isPrivateMode })}
              </strong>
            </span>
          </div>

          {(searchQuery || selectedType !== "all" || selectedCategory !== "all" || selectedAccount !== "all") && (
            <button
              onClick={resetFilters}
              className="text-forest-700 font-medium hover:underline ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </Card>

      {/* Transaction List / Table */}
      <Card className="p-0 overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="text-sm font-semibold text-foreground">No transactions found</p>
            <p className="text-xs text-muted-foreground">
              Try adjusting your filters or record a new transaction to populate the ledger.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (Hidden on mobile) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface-warm text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-foreground"
                      onClick={() => {
                        if (sortField === "date") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        else {
                          setSortField("date");
                          setSortOrder("desc");
                        }
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <span>Date</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="py-3 px-4">Description / Merchant</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Account & Method</th>
                    <th
                      className="py-3 px-4 text-right cursor-pointer hover:text-foreground"
                      onClick={() => {
                        if (sortField === "amount") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        else {
                          setSortField("amount");
                          setSortOrder("desc");
                        }
                      }}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Amount</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {filteredTransactions.map((tx) => {
                    const acc = accounts.find((a) => a.id === tx.accountId);
                    const fromAcc = accounts.find((a) => a.id === tx.fromAccountId);
                    const toAcc = accounts.find((a) => a.id === tx.toAccountId);

                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-surface-warm/60 transition-colors"
                      >
                        {/* Date */}
                        <td className="py-3 px-4 text-muted-foreground font-mono whitespace-nowrap">
                          {tx.date}
                        </td>

                        {/* Description & tags */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">
                              {tx.description}
                            </span>
                            {tx.isSplit && (
                              <button
                                onClick={() => setInspectingSplitTx(tx)}
                                className="inline-flex items-center gap-1 text-[10px] bg-terracotta-50 text-terracotta-700 px-1.5 py-0.5 rounded border border-terracotta-200 hover:bg-terracotta-100"
                                title="Click to view split details"
                              >
                                <Split className="h-2.5 w-2.5" />
                                <span>Split ({tx.splits?.length})</span>
                              </button>
                            )}
                          </div>
                          {tx.notes && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {tx.notes}
                            </p>
                          )}
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              tx.type === "income"
                                ? "income"
                                : tx.type === "transfer"
                                ? "transfer"
                                : "default"
                            }
                          >
                            {tx.type === "transfer" ? "Account Transfer" : tx.category || "Uncategorized"}
                          </Badge>
                        </td>

                        {/* Account & Payment Method */}
                        <td className="py-3 px-4">
                          {tx.type === "transfer" ? (
                            <span className="text-muted-foreground">
                              {fromAcc?.name || "Account"} &rarr; {toAcc?.name || "Account"}
                            </span>
                          ) : (
                            <div>
                              <span className="font-medium text-foreground">
                                {acc?.name || "Account"}
                              </span>
                              <span className="text-muted-foreground text-[11px] ml-1.5">
                                ({tx.paymentMethod || "UPI"})
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`font-bold tabular-nums text-sm ${
                              tx.type === "expense"
                                ? "text-foreground"
                                : tx.type === "income"
                                ? "text-finance-income"
                                : "text-muted-foreground"
                            }`}
                          >
                            {formatSignedAmount(tx.amount, tx.type, isPrivateMode)}
                          </span>
                        </td>

                        {/* Row Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setEditingTransaction(tx);
                                setIsQuickAddOpen(true);
                              }}
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface-muted"
                              title="Edit Transaction"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDuplicate(tx)}
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface-muted"
                              title="Quick Duplicate"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(tx.id)}
                              className="p-1 rounded text-muted-foreground hover:text-finance-expense hover:bg-surface-muted"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (Visible only on < sm screens) */}
            <div className="sm:hidden divide-y divide-border">
              {filteredTransactions.map((tx) => {
                const acc = accounts.find((a) => a.id === tx.accountId);
                const fromAcc = accounts.find((a) => a.id === tx.fromAccountId);
                const toAcc = accounts.find((a) => a.id === tx.toAccountId);

                return (
                  <div
                    key={tx.id}
                    className="p-3.5 space-y-2 hover:bg-surface-warm/40 transition-colors"
                  >
                    {/* Top Row: Description & Amount */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-sm text-foreground break-words">
                            {tx.description}
                          </span>
                          {tx.isSplit && (
                            <button
                              onClick={() => setInspectingSplitTx(tx)}
                              className="inline-flex items-center gap-1 text-[10px] bg-terracotta-50 text-terracotta-700 px-1.5 py-0.5 rounded border border-terracotta-200"
                              title="View splits"
                            >
                              <Split className="h-2.5 w-2.5" />
                              <span>Split ({tx.splits?.length})</span>
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className="font-mono">{tx.date}</span>
                          <span>•</span>
                          {tx.type === "transfer" ? (
                            <span>{fromAcc?.name || "Account"} &rarr; {toAcc?.name || "Account"}</span>
                          ) : (
                            <span>{acc?.name || "Account"} ({tx.paymentMethod || "UPI"})</span>
                          )}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`font-bold tabular-nums text-sm ${
                            tx.type === "expense"
                              ? "text-foreground"
                              : tx.type === "income"
                              ? "text-finance-income"
                              : "text-muted-foreground"
                          }`}
                        >
                          {formatSignedAmount(tx.amount, tx.type, isPrivateMode)}
                        </span>
                      </div>
                    </div>

                    {/* Notes if present */}
                    {tx.notes && (
                      <p className="text-[11px] text-muted-foreground bg-surface-warm/60 px-2 py-1 rounded">
                        {tx.notes}
                      </p>
                    )}

                    {/* Bottom Row: Category Badge & Action Buttons */}
                    <div className="flex items-center justify-between pt-1">
                      <Badge
                        variant={
                          tx.type === "income"
                            ? "income"
                            : tx.type === "transfer"
                            ? "transfer"
                            : "default"
                        }
                      >
                        {tx.type === "transfer" ? "Account Transfer" : tx.category || "Uncategorized"}
                      </Badge>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingTransaction(tx);
                            setIsQuickAddOpen(true);
                          }}
                          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-muted"
                          title="Edit Transaction"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(tx)}
                          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-muted"
                          title="Quick Duplicate"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="p-1.5 rounded text-muted-foreground hover:text-finance-expense hover:bg-surface-muted"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* SPLIT TRANSACTION INSPECTION DIALOG */}
      <Dialog
        open={Boolean(inspectingSplitTx)}
        onOpenChange={() => setInspectingSplitTx(null)}
      >
        <DialogHeader>
          <DialogTitle>Split Transaction Allocations</DialogTitle>
          <DialogClose onClose={() => setInspectingSplitTx(null)} />
        </DialogHeader>
        <DialogContent className="space-y-4">
          {inspectingSplitTx && (
            <>
              <div className="rounded-card border border-border bg-surface-warm p-3">
                <p className="text-xs text-muted-foreground">Original Transaction</p>
                <div className="flex justify-between items-center mt-1">
                  <span className="font-semibold text-foreground">
                    {inspectingSplitTx.description}
                  </span>
                  <span className="text-base font-bold tabular-nums text-foreground">
                    ₹{inspectingSplitTx.amount.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Category Breakdown
                </p>
                <div className="divide-y divide-border rounded-btn border border-border bg-white">
                  {inspectingSplitTx.splits?.map((split, i) => (
                    <div key={i} className="flex justify-between items-center p-3 text-xs">
                      <div>
                        <span className="font-medium text-foreground">{split.category}</span>
                        {split.notes && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {split.notes}
                          </p>
                        )}
                      </div>
                      <span className="font-bold tabular-nums text-foreground">
                        ₹{Number(split.amount).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInspectingSplitTx(null)}
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* CSV IMPORT PREVIEW DIALOG */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogHeader>
          <DialogTitle>Preview CSV Import</DialogTitle>
          <DialogClose onClose={() => setIsImportModalOpen(false)} />
        </DialogHeader>
        <DialogContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Found <strong>{importedRows.length}</strong> rows in uploaded CSV.
            Review the first entries below before confirming import to your ledger:
          </p>

          <div className="max-h-60 overflow-y-auto rounded-btn border border-border bg-surface-warm p-2 text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border text-[10px] text-muted-foreground uppercase">
                  <th className="p-1">Date</th>
                  <th className="p-1">Description</th>
                  <th className="p-1">Amount</th>
                  <th className="p-1">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {importedRows.slice(0, 10).map((r, i) => (
                  <tr key={i}>
                    <td className="p-1">{r.Date || r.date || "N/A"}</td>
                    <td className="p-1 font-medium">{r.Description || r.description || "N/A"}</td>
                    <td className="p-1 tabular-nums">₹{r.Amount || r.amount || "0"}</td>
                    <td className="p-1">{r.Type || r.type || "expense"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleConfirmImport}
            >
              Confirm Import ({importedRows.length} rows)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Add / Edit Transaction Modal */}
      <QuickAddModal
        open={isQuickAddOpen}
        onOpenChange={setIsQuickAddOpen}
        editTransaction={editingTransaction}
      />
    </div>
  );
}
