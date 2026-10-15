"use client";

import React from "react";
import { Plus, ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
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
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-background/95 px-4 md:px-8 backdrop-blur-sm">
      {/* Page Title & Breadcrumb */}
      <div>
        <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-muted-foreground hidden sm:block">
            {subtitle}
          </p>
        )}
      </div>

      {/* Center/Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Month Selector */}
        {selectedMonth && (
          <div className="flex items-center rounded-btn border border-border bg-white shadow-subtle p-0.5">
            <button
              onClick={onPrevMonth}
              className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2.5 text-xs font-semibold text-foreground tracking-tight select-none">
              {selectedMonth}
            </span>
            <button
              onClick={onNextMonth}
              className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-colors"
              title="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Quick Privacy Toggle */}
        <button
          onClick={onTogglePrivateMode}
          className="flex h-9 w-9 items-center justify-center rounded-btn border border-border bg-white text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-colors shadow-subtle"
          title={isPrivateMode ? "Show monetary amounts" : "Hide sensitive amounts (Private Mode)"}
        >
          {isPrivateMode ? (
            <EyeOff className="h-4 w-4 text-finance-warning" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>

        {/* Quick Add Button */}
        <Button
          onClick={onOpenQuickAdd}
          variant="default"
          size="default"
          className="gap-1.5"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span className="font-medium text-xs md:text-sm">Add Transaction</span>
          <span className="hidden lg:inline-block ml-1 text-[10px] bg-forest-600/40 text-white/90 px-1.5 py-0.5 rounded font-mono">
            ⌘K
          </span>
        </Button>
      </div>
    </header>
  );
}
