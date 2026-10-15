"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { store } from "@/lib/data/storage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Credentials
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2: Onboarding preferences
  const [currency, setCurrency] = useState("INR");
  const [accountName, setAccountName] = useState("HDFC Salary A/C");
  const [accountType, setAccountType] = useState("checking");
  const [openingBalance, setOpeningBalance] = useState("50000");
  const [paydayDay, setPaydayDay] = useState("30");

  const hasSupabase = isSupabaseConfigured();

  const handleNextStep = (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    setStep(2);
  };

  const handleCompleteSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (hasSupabase) {
      try {
        // 1. Call server signup endpoint (provisions user, auto-confirms email, creates profile & accounts)
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            fullName,
            currency,
            paydayDay: parseInt(paydayDay, 10) || 30,
            accountName,
            accountType,
            openingBalance: parseFloat(openingBalance) || 0,
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          toast.error(json.error || "Failed to set up account.");
          setIsLoading(false);
          return;
        }

        // 2. Establish live Supabase browser session
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (authError) {
            toast.error(authError.message);
            setIsLoading(false);
            return;
          }

          if (authData?.user) {
            await store.loadUserDataFromSupabase(authData.user);
          }
        }

        toast.success(`Welcome to Daybook, ${fullName || "User"}! Your cloud ledger is live.`);
        window.location.href = "/dashboard";
      } catch (err) {
        console.error("Signup error:", err);
        toast.error("Sign up failed: " + (err.message || "Network error"));
        setIsLoading(false);
      }
    } else {
      // Configure local profile & first account
      store.state.profile = {
        id: `user_${Date.now()}`,
        fullName: fullName.trim(),
        email: email || "user@example.in",
        currency,
        paydayDayOfMonth: parseInt(paydayDay, 10) || 30,
        isPaydayConfigured: true,
        expectedPaydayIncome: parseFloat(openingBalance) * 2 || 100000,
      };

      store.state.accounts = [
        {
          id: `acc_initial_${Date.now()}`,
          name: accountName.trim(),
          type: accountType,
          openingBalance: parseFloat(openingBalance) || 0,
          balance: parseFloat(openingBalance) || 0,
          includeInNetWorth: true,
          isArchived: false,
          color: "#456B50",
          accountNumber: "Primary",
        },
      ];

      store.notify();
      toast.success("Onboarding completed! Welcome to Daybook.");
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 selection:bg-forest-100 selection:text-forest-900">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-10 w-10 rounded-xl bg-forest-500 items-center justify-center text-white font-serif font-bold text-xl shadow-subtle mx-auto">
            D
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {step === 1 ? "Create your Daybook" : "Set up your Ledger"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {step === 1
              ? "Know where your money goes with precision."
              : "Step 2: Configure your primary account & payday."}
          </p>
        </div>

        <Card className="p-6">
          {step === 1 ? (
            <form onSubmit={handleNextStep} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Full name
                </label>
                <Input
                  placeholder="e.g. Arjun Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Email address
                </label>
                <Input
                  type="email"
                  placeholder="name@example.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" variant="default" size="default" className="w-full gap-1.5">
                <span>Continue to Ledger Setup</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleCompleteSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Currency
                  </label>
                  <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    <option value="INR">INR (₹) - Indian Rupee</option>
                    <option value="USD">USD ($) - US Dollar</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Monthly Payday
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={paydayDay}
                    onChange={(e) => setPaydayDay(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Primary Account Name
                </label>
                <Input
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Account Type
                  </label>
                  <Select value={accountType} onChange={(e) => setAccountType(e.target.value)}>
                    <option value="checking">Checking / Salary</option>
                    <option value="savings">Savings</option>
                    <option value="cash">Cash in Hand</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Opening Balance (₹)
                  </label>
                  <Input
                    type="number"
                    step="any"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  size="default"
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? "Setting up..." : "Complete Setup & Launch"}
                </Button>
              </div>
            </form>
          )}

          <div className="pt-4 border-t border-border mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-forest-700 font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
