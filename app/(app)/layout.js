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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const unsubscribe = store.subscribe((newState) => {
      setAppState({ ...newState });
    });
    return () => unsubscribe();
  }, []);

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
      {/* Sidebar (Desktop Sticky + Mobile Slide-Over Drawer) */}
      <Sidebar
        state={appState}
        onTogglePrivateMode={handleTogglePrivateMode}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
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
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />

        <main className="flex-1 p-3 sm:p-4 md:p-8 pb-24 md:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        onOpenSidebar={() => setIsMobileSidebarOpen(true)}
      />

      {/* Global Quick Add Transaction Modal */}
      <QuickAddModal
        open={isQuickAddOpen}
        onOpenChange={setIsQuickAddOpen}
      />
    </div>
  );
}
