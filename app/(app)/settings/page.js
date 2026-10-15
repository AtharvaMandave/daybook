"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Settings,
  ShieldCheck,
  RotateCcw,
  Download,
  Eye,
  EyeOff,
  Calendar,
  DollarSign,
  Server,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { store } from "@/lib/data/storage";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const [appState, setAppState] = useState(store.getState());
  const [currency, setCurrency] = useState("INR");
  const [paydayDay, setPaydayDay] = useState("30");
  const [expectedPaydayIncome, setExpectedPaydayIncome] = useState("135000");
  const [isPaydayConfigured, setIsPaydayConfigured] = useState(true);

  useEffect(() => {
    const unsubscribe = store.subscribe((newState) => {
      setAppState({ ...newState });
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (appState.profile) {
      setCurrency(appState.profile.currency || "INR");
      setPaydayDay(String(appState.profile.paydayDayOfMonth || 30));
      setExpectedPaydayIncome(String(appState.profile.expectedPaydayIncome || 135000));
      setIsPaydayConfigured(Boolean(appState.profile.isPaydayConfigured));
    }
  }, [appState.profile]);

  const hasSupabase = isSupabaseConfigured();

  const handleSaveProfile = (e) => {
    e.preventDefault();
    const updated = {
      ...appState.profile,
      currency,
      paydayDayOfMonth: parseInt(paydayDay, 10) || 30,
      expectedPaydayIncome: parseFloat(expectedPaydayIncome) || 0,
      isPaydayConfigured,
    };
    appState.profile = updated;
    store.notify();
    toast.success("Preferences updated successfully.");
  };

  const handleResetDemo = () => {
    if (window.confirm("Reset all accounts, transactions, and budgets back to the initial demo data?")) {
      store.resetToDefaultDemo();
      toast.success("Restored default Indian demo dataset.");
    }
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(appState, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `daybook_backup_${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    toast.success("Downloaded full JSON backup.");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
          Settings & Financial Preferences
        </h2>
        <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
          Configure currency defaults, payday parameters for Safe to Spend, and database connectivity.
        </p>
      </div>

      {/* Supabase Connection Status Banner */}
      <Card className="border-sage-200 bg-surface-sage/30">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Server className="h-5 w-5 text-forest-700 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">Backend & Storage Mode</h3>
                <Badge variant={hasSupabase ? "income" : "default"}>
                  {hasSupabase ? "Supabase PostgreSQL Active" : "Local Demo Mode Active"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {hasSupabase
                  ? "Connected to production Supabase database with Row Level Security."
                  : "Currently running with local storage persistence and rich Indian sample finance data. To connect to your Supabase project, provide NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment."}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Financial Preferences Form */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Profile & Payday Parameters</CardTitle>
        </CardHeader>
        <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Default Currency
              </label>
              <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="INR">INR (₹) - Indian Rupee</option>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Payday Day of Month (1 - 31)
              </label>
              <Input
                type="number"
                min="1"
                max="31"
                value={paydayDay}
                onChange={(e) => setPaydayDay(e.target.value)}
                required
              />
              <span className="text-[11px] text-muted-foreground mt-0.5 block">
                Used by Safe to Spend to calculate remaining spending runway.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Expected Payday Salary Credit (₹)
              </label>
              <Input
                type="number"
                step="any"
                min="0"
                value={expectedPaydayIncome}
                onChange={(e) => setExpectedPaydayIncome(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="paydayCheck"
                checked={isPaydayConfigured}
                onChange={(e) => setIsPaydayConfigured(e.target.checked)}
                className="h-4 w-4 rounded border-border text-forest-600 focus:ring-forest-500"
              />
              <label htmlFor="paydayCheck" className="text-xs font-medium text-foreground">
                Enable Safe to Spend calculation engine
              </label>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button type="submit" variant="default" size="sm">
              Save Preferences
            </Button>
          </div>
        </form>
      </Card>

      {/* Visual Privacy Mode Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {appState.isPrivateMode ? (
              <EyeOff className="h-4 w-4 text-finance-warning" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
            <CardTitle>Visual Privacy Mode</CardTitle>
          </div>
          <Badge variant={appState.isPrivateMode ? "warning" : "outline"} className="text-xs">
            {appState.isPrivateMode ? "Enabled" : "Disabled"}
          </Badge>
        </CardHeader>
        <div className="space-y-3 pt-2 text-xs text-muted-foreground">
          <p>
            Visual Privacy Mode masks sensitive account balances, salary amounts, and transactions
            as <code className="bg-surface-muted px-1 rounded text-foreground font-mono">••••••</code> throughout
            the entire interface so you can safely use Daybook in public cafes or shared screens.
          </p>
          <p className="text-[11px] italic">
            Note: Visual Privacy Mode only conceals figures on screen; it does not encrypt local storage
            or alter server database records.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => store.togglePrivateMode()}
          >
            {appState.isPrivateMode ? "Turn Off Privacy Mode" : "Turn On Privacy Mode"}
          </Button>
        </div>
      </Card>

      {/* Data Management & Demo Reset */}
      <Card>
        <CardHeader>
          <CardTitle>Data Management & Demo Controls</CardTitle>
        </CardHeader>
        <div className="space-y-4 pt-2 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <p className="font-semibold text-foreground">Export Full JSON Ledger Backup</p>
              <p className="text-muted-foreground text-[11px]">
                Download your accounts, transactions, recurring rules, and budgets as JSON.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJSON}
              className="gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Backup JSON</span>
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">Reset Demo Data</p>
              <p className="text-muted-foreground text-[11px]">
                Restore initial realistic Indian sample ledger with fresh October transactions.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDemo}
              className="gap-1.5 text-finance-expense hover:text-finance-expense"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Data</span>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
