"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  Repeat,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { store } from "@/lib/data/storage";
import { formatCurrency, formatSignedAmount } from "@/lib/finance/currency";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuickAddModal } from "@/components/transactions/quick-add-modal";

export default function CalendarPage() {
  const [appState, setAppState] = useState(store.getState());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = store.subscribe((newState) => {
      setAppState({ ...newState });
    });
    return () => unsubscribe();
  }, []);

  const { transactions, recurringRules, plannedEvents, profile, isPrivateMode } = appState;

  // Month navigation
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Calendar matrix calculations
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  // Group events by YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map = {};

    // 1. Transactions
    for (const t of transactions) {
      const dateKey = t.date;
      if (!map[dateKey]) map[dateKey] = { transactions: [], recurring: [], planned: [], isPayday: false };
      map[dateKey].transactions.push(t);
    }

    // 2. Recurring bills
    for (const r of recurringRules) {
      if (r.isPaused) continue;
      const dateKey = r.nextDueDate;
      if (!map[dateKey]) map[dateKey] = { transactions: [], recurring: [], planned: [], isPayday: false };
      map[dateKey].recurring.push(r);
    }

    // 3. Planned events
    for (const p of plannedEvents) {
      const dateKey = p.date;
      if (!map[dateKey]) map[dateKey] = { transactions: [], recurring: [], planned: [], isPayday: false };
      map[dateKey].planned.push(p);
    }

    // 4. Payday indicator (30th of month)
    const paydayKey = format(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth(), profile.paydayDayOfMonth || 30),
      "yyyy-MM-dd"
    );
    if (!map[paydayKey]) map[paydayKey] = { transactions: [], recurring: [], planned: [], isPayday: true };
    else map[paydayKey].isPayday = true;

    return map;
  }, [transactions, recurringRules, plannedEvents, currentMonth, profile]);

  // Selected date events
  const selectedDateKey = format(selectedDate, "yyyy-MM-dd");
  const selectedDayData = eventsByDate[selectedDateKey] || {
    transactions: [],
    recurring: [],
    planned: [],
    isPayday: selectedDate.getDate() === (profile.paydayDayOfMonth || 30),
  };

  // Build grid calendar days
  const calendarDays = [];
  let day = startDate;
  while (day <= endDate) {
    calendarDays.push(day);
    day = addDays(day, 1);
  }

  const weekHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            Money Calendar
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Visualize cash flow timing, upcoming recurring obligations, and scheduled paydays.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Month Navigator */}
          <div className="flex items-center rounded-btn border border-border bg-white shadow-subtle p-0.5">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-xs font-semibold text-foreground">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <Button
            variant="default"
            size="sm"
            onClick={() => setIsQuickAddOpen(true)}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Add Entry</span>
          </Button>
        </div>
      </div>

      {/* Main Grid: Calendar on Left, Selected Day Details on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View (2 cols) */}
        <Card className="lg:col-span-2 p-4">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground pb-2 border-b border-border">
            {weekHeaders.map((w, i) => (
              <div key={i} className="py-1">
                {w}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 pt-2">
            {calendarDays.map((d, index) => {
              const dateKey = format(d, "yyyy-MM-dd");
              const isCurrentMonth = isSameMonth(d, currentMonth);
              const isSelected = isSameDay(d, selectedDate);
              const dayData = eventsByDate[dateKey];

              const hasTx = dayData?.transactions?.length > 0;
              const hasRecurring = dayData?.recurring?.length > 0;
              const hasPlanned = dayData?.planned?.length > 0;
              const isPayday = dayData?.isPayday && isCurrentMonth;

              return (
                <div
                  key={index}
                  onClick={() => setSelectedDate(d)}
                  className={`min-h-[82px] rounded-btn border p-1.5 flex flex-col justify-between cursor-pointer transition-all ${
                    isSelected
                      ? "border-forest-500 bg-surface-sage/40 ring-1 ring-forest-500 shadow-subtle"
                      : isCurrentMonth
                      ? "border-border bg-white hover:border-forest-300 hover:bg-surface-warm"
                      : "border-border/40 bg-surface-muted/30 text-muted-foreground/60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold ${
                        isSelected ? "text-forest-900 font-bold" : "text-foreground"
                      }`}
                    >
                      {format(d, "d")}
                    </span>

                    {isPayday && (
                      <span className="text-[9px] bg-forest-600 text-white font-bold px-1 rounded">
                        Payday
                      </span>
                    )}
                  </div>

                  {/* Day markers / indicators */}
                  <div className="space-y-1 my-auto">
                    {hasTx && (
                      <div className="text-[10px] font-medium text-finance-expense flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-finance-expense" />
                        <span>{dayData.transactions.length} record(s)</span>
                      </div>
                    )}
                    {hasRecurring && (
                      <div className="text-[10px] font-medium text-finance-warning flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-finance-warning" />
                        <span>{dayData.recurring.length} bill(s)</span>
                      </div>
                    )}
                    {hasPlanned && (
                      <div className="text-[10px] font-medium text-terracotta-700 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-terracotta-500" />
                        <span>Planned event</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Selected Day Agenda Detail Panel (1 col) */}
        <Card className="flex flex-col justify-between">
          <div>
            <CardHeader className="border-b border-border pb-3">
              <div>
                <CardTitle>{format(selectedDate, "EEEE, MMMM d")}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Events & payments for this date
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {selectedDayData.isPayday ? "Payday" : "Standard Day"}
              </Badge>
            </CardHeader>

            <div className="space-y-4 pt-4">
              {/* Payday Notification */}
              {selectedDayData.isPayday && (
                <div className="rounded-btn border border-sage-200 bg-surface-sage/60 p-3 flex items-start gap-2.5">
                  <Sparkles className="h-4 w-4 text-forest-700 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-forest-900">Configured Payday</p>
                    <p className="text-[11px] text-forest-800 mt-0.5">
                      Expected monthly salary credit of ₹{profile.expectedPaydayIncome?.toLocaleString("en-IN")}.
                    </p>
                  </div>
                </div>
              )}

              {/* Recorded Transactions on this date */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Recorded Transactions ({selectedDayData.transactions.length})
                </h4>
                {selectedDayData.transactions.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    No transactions recorded on this day.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayData.transactions.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between p-2.5 rounded-btn border border-border bg-white text-xs"
                      >
                        <div>
                          <p className="font-semibold text-foreground">{t.description}</p>
                          <span className="text-[11px] text-muted-foreground">
                            {t.category} • {t.paymentMethod}
                          </span>
                        </div>
                        <span
                          className={`font-bold tabular-nums ${
                            t.type === "expense"
                              ? "text-foreground"
                              : t.type === "income"
                              ? "text-finance-income"
                              : "text-muted-foreground"
                          }`}
                        >
                          {formatSignedAmount(t.amount, t.type, isPrivateMode)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upcoming Recurring Bills on this date */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Recurring Obligations ({selectedDayData.recurring.length})
                </h4>
                {selectedDayData.recurring.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    No recurring bills scheduled.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayData.recurring.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between p-2.5 rounded-btn border border-amber-200 bg-finance-warningBg text-xs"
                      >
                        <div>
                          <p className="font-semibold text-foreground">{r.name}</p>
                          <span className="text-[11px] text-finance-warning">
                            Due • {r.frequency}
                          </span>
                        </div>
                        <span className="font-bold tabular-nums text-foreground">
                          {formatCurrency(r.amount, { isPrivate: isPrivateMode })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Planned Events */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Planned Events ({selectedDayData.planned.length})
                </h4>
                {selectedDayData.planned.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    No planned purchases or events.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayData.planned.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2.5 rounded-btn border border-terracotta-200 bg-terracotta-50 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-foreground">{p.title}</p>
                          <span className="text-[11px] text-terracotta-700">
                            Planned • {p.category}
                          </span>
                        </div>
                        <span className="font-bold tabular-nums text-foreground">
                          {formatCurrency(p.amount, { isPrivate: isPrivateMode })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsQuickAddOpen(true)}
              className="w-full gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Record Expense on {format(selectedDate, "MMM d")}</span>
            </Button>
          </div>
        </Card>
      </div>

      <QuickAddModal
        open={isQuickAddOpen}
        onOpenChange={setIsQuickAddOpen}
      />
    </div>
  );
}
