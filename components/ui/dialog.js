"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "./button";

export function Dialog({ open, onOpenChange, children }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && open) {
        onOpenChange?.(false);
      }
    };
    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#242820]/40 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange?.(false)}
      />
      {/* Dialog container */}
      <div className="relative z-50 w-full max-w-lg overflow-hidden rounded-card border border-border bg-white shadow-elevated animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ className, children }) {
  return (
    <div className={cn("flex items-center justify-between border-b border-border px-5 py-4", className)}>
      {children}
    </div>
  );
}

export function DialogTitle({ className, children }) {
  return (
    <h2 className={cn("text-base font-semibold text-foreground", className)}>
      {children}
    </h2>
  );
}

export function DialogContent({ className, children }) {
  return (
    <div className={cn("p-5 overflow-y-auto max-h-[75vh]", className)}>
      {children}
    </div>
  );
}

export function DialogClose({ onClose }) {
  return (
    <button
      onClick={onClose}
      className="rounded-btn p-1 text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-colors"
      aria-label="Close"
    >
      <X className="h-4 w-4" />
    </button>
  );
}
