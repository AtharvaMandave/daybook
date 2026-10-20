"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ReceiptText,
  PieChart,
  Plus,
  Menu,
} from "lucide-react";
import { cn } from "../ui/button";

export function MobileNav({ onOpenQuickAdd, onOpenSidebar }) {
  const pathname = usePathname();

  const mainTabs = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Transactions", href: "/transactions", icon: ReceiptText },
    { label: "Budgets", href: "/budgets", icon: PieChart },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-border bg-white/95 px-2 md:hidden shadow-elevated backdrop-blur-md pb-safe">
      {mainTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors px-2 py-1 rounded-btn",
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
        className="flex h-11 w-11 items-center justify-center rounded-full bg-forest-500 text-white shadow-elevated hover:bg-forest-600 active:scale-95 transition-transform -mt-2 border-2 border-white"
        aria-label="Add transaction"
      >
        <Plus className="h-6 w-6 stroke-[2.5]" />
      </button>

      {/* Unified Sidebar / More Menu Trigger */}
      <button
        onClick={onOpenSidebar}
        className="flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors px-2 py-1 rounded-btn text-muted-foreground hover:text-foreground active:bg-surface-muted"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
        <span>Menu</span>
      </button>
    </nav>
  );
}
