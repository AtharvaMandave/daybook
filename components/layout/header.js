"use client";

import React from "react";
import { Plus, ChevronLeft, ChevronRight, Eye, EyeOff, Menu } from "lucide-react";
import { Button } from "../ui/button";

export function Header({
  title,
  subtitle,
  selectedMonth,
  onPrevMonth,
  onNextMonth,
  onOpenQuickAdd,
  isPrivateMode,
  onTogglePrivateMode,
  onOpenMobileSidebar,
}) {
  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-border bg-background/95 px-3 sm:px-4 md:px-8 backdrop-blur-sm">
      {/* Left: Mobile Menu Trigger + Page Title */}
      <div className="flex items-center gap-2 min-w-0">
        {onOpenMobileSidebar && (
          <button
            onClick={onOpenMobileSidebar}
            className="md:hidden p-2 -ml-1 rounded-btn text-foreground hover:bg-surface-muted transition-colors shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <div className="min-w-0">
          <h1 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-foreground truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground hidden lg:block truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Month Selector */}
        {selectedMonth && (
          <div className="flex items-center rounded-btn border border-border bg-white shadow-subtle p-0.5">
            <button
              onClick={onPrevMonth}
              className="p-1 sm:p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-colors"
              title="Previous Month"
              aria-label="Previous Month"
            >
              <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
            <span className="px-1.5 sm:px-2.5 text-[11px] sm:text-xs font-semibold text-foreground tracking-tight select-none whitespace-nowrap">
              {selectedMonth}
            </span>
            <button
              onClick={onNextMonth}
              className="p-1 sm:p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-colors"
              title="Next Month"
              aria-label="Next Month"
            >
              <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>
        )}

        {/* Quick Privacy Toggle */}
        <button
          onClick={onTogglePrivateMode}
          className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-btn border border-border bg-white text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-colors shadow-subtle shrink-0"
          title={isPrivateMode ? "Show monetary amounts" : "Hide sensitive amounts (Private Mode)"}
          aria-label="Toggle Privacy Mode"
        >
          {isPrivateMode ? (
            <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-finance-warning" />
          ) : (
            <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          )}
        </button>

        {/* Quick Add Button (Desktop & Tablet) */}
        <Button
          onClick={onOpenQuickAdd}
          variant="default"
          size="default"
          className="hidden sm:inline-flex gap-1.5 text-xs sm:text-sm h-8 sm:h-9 px-3"
        >
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[2.5]" />
          <span>Add Transaction</span>
          <span className="hidden lg:inline-block ml-1 text-[10px] bg-forest-600/40 text-white/90 px-1.5 py-0.5 rounded font-mono">
            ⌘K
          </span>
        </Button>
      </div>
    </header>
  );
}
