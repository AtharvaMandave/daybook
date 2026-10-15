"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ReceiptText,
  PieChart,
  Plus,
  Menu,
  CalendarDays,
  Repeat,
  BarChart3,
  Wallet,
  Settings,
  X,
} from "lucide-react";
import { cn } from "../ui/button";

export function MobileNav({ onOpenQuickAdd }) {
  const pathname = usePathname();
  const [showDrawer, setShowDrawer] = useState(false);

  const mainTabs = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "History", href: "/transactions", icon: ReceiptText },
    { label: "Budgets", href: "/budgets", icon: PieChart },
  ];

  const drawerLinks = [
    { label: "Money Calendar", href: "/calendar", icon: CalendarDays },
    { label: "Recurring Bills", href: "/recurring", icon: Repeat },
    { label: "Reports & Trends", href: "/reports", icon: BarChart3 },
    { label: "Accounts & Net Worth", href: "/accounts", icon: Wallet },
    { label: "Settings & Profile", href: "/settings", icon: Settings },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-border bg-white px-2 md:hidden shadow-elevated">
        {mainTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                isActive ? "text-forest-600 font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive ? "stroke-[2.5]" : "stroke-[1.8]")} />
              <span>{tab.label}</span>
            </Link>
          );
        })}

        {/* Center Prominent Add Button */}
        <button
          onClick={onOpenQuickAdd}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-forest-500 text-white shadow-elevated hover:bg-forest-600 active:scale-95 transition-transform"
          aria-label="Add transaction"
        >
          <Plus className="h-6 w-6 stroke-[2.5]" />
        </button>

        {/* More Drawer Trigger */}
        <button
          onClick={() => setShowDrawer(true)}
          className={cn(
            "flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
            drawerLinks.some((l) => pathname === l.href) ? "text-forest-600 font-semibold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Menu className="h-5 w-5" />
          <span>More</span>
        </button>
      </nav>

      {/* Drawer Overlay */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-[#242820]/40 backdrop-blur-sm md:hidden animate-in fade-in">
          <div
            className="flex-1"
            onClick={() => setShowDrawer(false)}
          />
          <div className="rounded-t-2xl border-t border-border bg-white p-5 shadow-elevated animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <span className="text-sm font-semibold text-foreground">Navigation & Tools</span>
              <button
                onClick={() => setShowDrawer(false)}
                className="p-1 rounded-btn text-muted-foreground hover:bg-surface-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="py-3 space-y-1">
              {drawerLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setShowDrawer(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-btn text-sm font-medium transition-colors",
                      isActive
                        ? "bg-surface-sage text-forest-800 font-semibold"
                        : "text-foreground hover:bg-surface-muted"
                    )}
                  >
                    <Icon className="h-4 w-4 text-forest-600" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
