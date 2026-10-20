import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles, TrendingUp, PieChart, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-between selection:bg-forest-100 selection:text-forest-900">
      {/* Top Bar */}
      <header className="flex h-16 items-center justify-between px-6 md:px-12 border-b border-border bg-surface-warm/60">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-forest-500 flex items-center justify-center text-white font-serif font-bold text-lg shadow-subtle">
            D
          </div>
          <div>
            <span className="text-base font-semibold tracking-tight text-foreground block leading-none">
              Daybook
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
              Personal Finance
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="default" size="sm" className="gap-1.5">
              <span>Open Dashboard</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-4xl mx-auto px-6 py-16 md:py-24 text-center flex flex-col items-center justify-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-sage-200 bg-surface-sage px-3 py-1 text-xs font-semibold text-forest-800 mb-6 shadow-subtle">
          <Sparkles className="h-3.5 w-3.5 text-forest-600" />
          <span>Know where your money goes.</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground max-w-2xl leading-tight">
          Calm, accurate personal finance.
        </h1>

        <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-xl">
          An elegant personal expense tracker and calculation engine. Record transactions in seconds,
          understand real category burn, and know exactly how much you can safely spend until payday.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
          <Link href="/dashboard">
            <Button variant="default" size="lg" className="gap-2 shadow-elevated">
              <span>Open Daybook Ledger</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg">
              Sign In
            </Button>
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 text-left w-full">
          <div className="rounded-card border border-border bg-white p-5 shadow-card space-y-2">
            <div className="h-8 w-8 rounded-lg bg-surface-sage flex items-center justify-center text-forest-700">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Safe to Spend Engine</h3>
            <p className="text-xs text-muted-foreground">
              Mathematical estimation of spendable funds before your next salary credit, reserving upcoming obligations.
            </p>
          </div>

          <div className="rounded-card border border-border bg-white p-5 shadow-card space-y-2">
            <div className="h-8 w-8 rounded-lg bg-terracotta-50 flex items-center justify-center text-terracotta-700">
              <PieChart className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Accurate Accounting</h3>
            <p className="text-xs text-muted-foreground">
              Transfers never inflate income or expenses. Split receipts and multi-account credit card liabilities are handled correctly.
            </p>
          </div>

          <div className="rounded-card border border-border bg-white p-5 shadow-card space-y-2">
            <div className="h-8 w-8 rounded-lg bg-surface-warm flex items-center justify-center text-forest-800">
              <Repeat className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Money Calendar & Schedules</h3>
            <p className="text-xs text-muted-foreground">
              Map out rent, subscriptions, EMIs, and investments across the month without spreadsheets.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-6 md:px-12 text-center text-xs text-muted-foreground bg-surface-warm/40">
        <p>Daybook — Built with Next.js, Tailwind CSS, Supabase, and Vitest.</p>
      </footer>
    </div>
  );
}
