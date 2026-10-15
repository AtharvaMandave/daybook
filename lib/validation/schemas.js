import { z } from "zod";

export const transactionSchema = z
  .object({
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    type: z.enum(["expense", "income", "transfer"]),
    description: z.string().min(1, "Description or merchant name is required").max(120),
    date: z.string().min(1, "Transaction date is required"),
    category: z.string().optional(),
    accountId: z.string().optional(),
    fromAccountId: z.string().optional(),
    toAccountId: z.string().optional(),
    paymentMethod: z.string().optional().default("UPI"),
    notes: z.string().max(500).optional().default(""),
    tags: z.union([z.array(z.string()), z.string()]).optional().default([]),
    isSplit: z.boolean().optional().default(false),
    splits: z
      .array(
        z.object({
          amount: z.coerce.number().positive("Split amount must be greater than 0"),
          category: z.string().min(1, "Split category is required"),
          notes: z.string().optional().default(""),
        })
      )
      .optional()
      .default([]),
  })
  .superRefine((data, ctx) => {
    if (data.type === "transfer") {
      if (!data.fromAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fromAccountId"],
          message: "Source account is required for transfers",
        });
      }
      if (!data.toAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["toAccountId"],
          message: "Destination account is required for transfers",
        });
      }
      if (data.fromAccountId && data.toAccountId && data.fromAccountId === data.toAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["toAccountId"],
          message: "Source and destination accounts must be different",
        });
      }
    } else {
      if (!data.accountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["accountId"],
          message: "Account is required",
        });
      }
      if (!data.isSplit && !data.category) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["category"],
          message: "Category is required",
        });
      }
    }

    if (data.isSplit) {
      if (!data.splits || data.splits.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["splits"],
          message: "At least 2 split allocations are required for split transactions",
        });
      } else {
        const sum = data.splits.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
        if (Math.abs(sum - data.amount) > 0.01) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["splits"],
            message: `Split sum (₹${sum}) must equal transaction total (₹${data.amount})`,
          });
        }
      }
    }
  });

export const accountSchema = z.object({
  name: z.string().min(1, "Account name is required").max(60),
  type: z.enum(["checking", "savings", "credit", "cash", "wallet", "investment"]),
  openingBalance: z.coerce.number().default(0),
  includeInNetWorth: z.boolean().default(true),
  color: z.string().optional().default("#456B50"),
  accountNumber: z.string().optional().default(""),
});

export const budgetSchema = z.object({
  category: z.string().min(1, "Category is required"),
  limit: z.coerce.number().positive("Budget limit must be greater than 0"),
  period: z.enum(["monthly", "yearly"]).default("monthly"),
  rolloverAmount: z.coerce.number().min(0).default(0),
  warningThreshold: z.coerce.number().min(50).max(100).default(80),
});

export const recurringRuleSchema = z.object({
  name: z.string().min(1, "Rule name is required").max(100),
  type: z.enum(["expense", "income"]),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  category: z.string().min(1, "Category is required"),
  accountId: z.string().min(1, "Account is required"),
  frequency: z.enum(["weekly", "biweekly", "monthly", "quarterly", "yearly"]),
  startDate: z.string().min(1, "Start date is required"),
  nextDueDate: z.string().min(1, "Next due date is required"),
  endDate: z.string().optional().nullable(),
});
