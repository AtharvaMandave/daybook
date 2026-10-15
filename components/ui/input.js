import React from "react";
import { cn } from "./button";

export const Input = React.forwardRef(function Input(
  { className, type = "text", error, ...props },
  ref
) {
  return (
    <div className="w-full">
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-9 w-full rounded-btn border border-border bg-white px-3 py-1.5 text-sm text-foreground shadow-subtle transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-forest-500 focus-visible:ring-1 focus-visible:ring-forest-500 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-finance-expense focus-visible:border-finance-expense focus-visible:ring-finance-expense",
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-finance-expense">{error}</p>}
    </div>
  );
});

export const Textarea = React.forwardRef(function Textarea(
  { className, error, ...props },
  ref
) {
  return (
    <div className="w-full">
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[70px] w-full rounded-btn border border-border bg-white px-3 py-2 text-sm text-foreground shadow-subtle transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-forest-500 focus-visible:ring-1 focus-visible:ring-forest-500 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-finance-expense focus-visible:border-finance-expense focus-visible:ring-finance-expense",
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-finance-expense">{error}</p>}
    </div>
  );
});

export const Select = React.forwardRef(function Select(
  { className, error, children, ...props },
  ref
) {
  return (
    <div className="w-full">
      <select
        ref={ref}
        className={cn(
          "flex h-9 w-full rounded-btn border border-border bg-white px-3 py-1.5 text-sm text-foreground shadow-subtle transition-colors focus-visible:outline-none focus-visible:border-forest-500 focus-visible:ring-1 focus-visible:ring-forest-500 disabled:cursor-not-allowed disabled:opacity-50 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%2377786F%22%20stroke-width%3D%221.5%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:18px_18px] bg-no-repeat bg-[right_8px_center] pr-8",
          error && "border-finance-expense focus-visible:border-finance-expense focus-visible:ring-finance-expense",
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-finance-expense">{error}</p>}
    </div>
  );
});
