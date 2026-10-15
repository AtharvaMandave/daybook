"use client";

import React, { useState, useEffect } from "react";
import { format, addMonths, subMonths } from "date-fns";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { QuickAddModal } from "@/components/transactions/quick-add-modal";
import { store } from "@/lib/data/storage";

export default function AppLayout({ children }) {
  const [appState, setAppState] = useState(store.getState());
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date("2026-10-15T00:00:00"));

  useEffect(() => {
    const unsubscribe = store.subscribe((newState) => {
      setAppState({ ...newState });
    });
    return () => unsubscribe();
  }, []);

  // Sync date: If authenticated in live mode, use real current date
  useEffect(() => {
    if (!appState.isDemoMode) {
      setCurrentDate(new Date());
    }
  }, [appState.isDemoMode]);

  // Keyboard shortcut listener: Cmd+K or Ctrl+K opens quick add
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsQuickAddOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handlePrevMonth = () => {
    setCurrentDate((d) => subMonths(d, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((d) => addMonths(d, 1));
  };

  const handleTogglePrivateMode = () => {
    store.togglePrivateMode();
  };

  const formattedMonth = format(currentDate, "MMMM yyyy");

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <Sidebar
        state={appState}
        onTogglePrivateMode={handleTogglePrivateMode}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <Header
          title={formattedMonth}
          subtitle="Overview & Financial Activities"
          selectedMonth={formattedMonth}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onOpenQuickAdd={() => setIsQuickAddOpen(true)}
          isPrivateMode={appState.isPrivateMode}
          onTogglePrivateMode={handleTogglePrivateMode}
        />

        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav onOpenQuickAdd={() => setIsQuickAddOpen(true)} />

      {/* Global Quick Add Transaction Modal */}
      <QuickAddModal
        open={isQuickAddOpen}
        onOpenChange={setIsQuickAddOpen}
      />
    </div>
  );
}
