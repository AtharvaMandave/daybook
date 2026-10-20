"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ReceiptText,
  PieChart,
  CalendarDays,
  Repeat,
  BarChart3,
  Wallet,
  Settings,
  ShieldCheck,
  Eye,
  EyeOff,
  LogOut,
  LogIn,
} from "lucide-react";
import { cn } from "../ui/button";
import { store } from "@/lib/data/storage";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Transactions", href: "/transactions", icon: ReceiptText },
  { label: "Budgets", href: "/budgets", icon: PieChart },
  { label: "Money Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Recurring", href: "/recurring", icon: Repeat },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Accounts", href: "/accounts", icon: Wallet },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({ state, onTogglePrivateMode }) {
  const pathname = usePathname();

  const userInitials = state?.profile?.fullName
    ? state.profile.fullName
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : state?.user?.email?.slice(0, 2).toUpperCase() || "DB";

  const displayName = state?.profile?.fullName || (state?.user?.email ? state.user.email.split("@")[0] : "My Daybook");
  const displayEmail = state?.user?.email || state?.profile?.email || "Offline Ledger";

  return (
    <aside className="hidden md:flex md:w-60 lg:w-64 flex-col border-r border-border bg-surface-warm min-h-screen select-none">
      {/* Brand & Wordmark */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-border/60">
        <Link href="/dashboard" className="flex items-center gap-2.5">
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
        </Link>
      </div>

      {/* Cloud Status Badge */}
      <div className="mx-4 mt-3 rounded-btn border border-border/80 bg-white px-3 py-2 text-xs flex items-center justify-between shadow-subtle">
        {state?.user ? (
          <>
            <div className="flex items-center gap-2 text-emerald-900 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Supabase Cloud</span>
            </div>
            <span className="text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold font-mono">
              Synced
            </span>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-forest-600" />
              <span className="font-medium text-foreground">Local Ledger</span>
            </div>
            <Link
              href="/login"
              className="text-[10px] text-forest-700 bg-surface-sage hover:bg-forest-100 px-2 py-0.5 rounded font-semibold transition-colors"
            >
              Sign In
            </Link>
          </>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-btn transition-colors duration-150",
                isActive
                  ? "bg-forest-500 text-white shadow-subtle"
                  : "text-foreground/80 hover:bg-surface-sage/50 hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4",
                  isActive ? "text-white" : "text-muted-foreground"
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Profile & Privacy Control */}
      <div className="p-4 border-t border-border/60 space-y-3">
        {/* Visual Privacy Toggle */}
        <button
          onClick={onTogglePrivateMode}
          className="w-full flex items-center justify-between px-3 py-2 rounded-btn text-xs font-medium border border-border bg-white hover:bg-surface-muted text-foreground transition-colors"
          title="Toggle privacy mode to conceal sensitive monetary amounts"
        >
          <div className="flex items-center gap-2">
            {state?.isPrivateMode ? (
              <EyeOff className="h-3.5 w-3.5 text-finance-warning" />
            ) : (
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span>{state?.isPrivateMode ? "Private Mode (On)" : "Private Mode (Off)"}</span>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">
            {state?.isPrivateMode ? "Masked" : "Visible"}
          </span>
        </button>

        {/* User Card */}
        <div className="rounded-btn border border-border/80 bg-white p-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-full bg-forest-100 border border-forest-200 flex items-center justify-center text-forest-800 text-xs font-semibold shrink-0">
                {userInitials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {displayName}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {displayEmail}
                </p>
              </div>
            </div>

            {state?.user ? (
              <button
                onClick={() => store.signOut()}
                className="p-1.5 rounded text-muted-foreground hover:text-finance-expense hover:bg-surface-muted transition-colors"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            ) : (
              <Link
                href="/login"
                className="p-1.5 rounded text-muted-foreground hover:text-forest-700 hover:bg-surface-muted transition-colors"
                title="Sign in"
              >
                <LogIn className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
