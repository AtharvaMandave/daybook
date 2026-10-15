import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const Button = React.forwardRef(function Button(
  {
    className,
    variant = "default",
    size = "default",
    type = "button",
    disabled = false,
    children,
    ...props
  },
  ref
) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500/30 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer";

  const variants = {
    default:
      "bg-forest-500 text-white hover:bg-forest-600 active:bg-forest-700 shadow-subtle border border-forest-600/20",
    secondary:
      "bg-surface-warm text-foreground hover:bg-surface-muted active:bg-border/40 border border-border text-foreground",
    ghost:
      "bg-transparent text-foreground hover:bg-surface-sage/60 active:bg-surface-sage text-foreground",
    outline:
      "bg-transparent border border-border text-foreground hover:bg-surface-warm active:bg-surface-muted",
    danger:
      "bg-terracotta-500 text-white hover:bg-terracotta-600 active:bg-terracotta-700 shadow-subtle",
    terracotta:
      "bg-terracotta-50 text-terracotta-700 border border-terracotta-200 hover:bg-terracotta-100",
    subtle:
      "bg-surface-sage text-forest-800 hover:bg-sage-200 border border-sage-200/60",
  };

  const sizes = {
    sm: "h-8 px-3 text-xs rounded-btn gap-1.5",
    default: "h-9 px-4 text-sm rounded-btn gap-2",
    lg: "h-10 px-5 text-base rounded-btn gap-2.5",
    icon: "h-9 w-9 p-0 rounded-btn",
    iconSm: "h-7 w-7 p-0 rounded-btn",
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
});
