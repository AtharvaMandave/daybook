import React from "react";
import { cn } from "./button";

export function Badge({ className, variant = "default", children, ...props }) {
  const variants = {
    default: "bg-surface-sage text-forest-800 border-sage-200",
    outline: "bg-transparent text-foreground border-border",
    income: "bg-finance-incomeBg text-finance-income border-emerald-200",
    expense: "bg-finance-expenseBg text-finance-expense border-rose-200",
    transfer: "bg-finance-transferBg text-finance-transfer border-slate-200",
    warning: "bg-finance-warningBg text-finance-warning border-amber-200",
    terracotta: "bg-terracotta-50 text-terracotta-700 border-terracotta-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "rounded-card border border-border bg-white p-5 shadow-card",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn("flex items-center justify-between pb-3", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3
      className={cn("text-sm font-semibold tracking-tight text-foreground", className)}
      {...props}
    >
      {children}
    </h3>
  );
}
