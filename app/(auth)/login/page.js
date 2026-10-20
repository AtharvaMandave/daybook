"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Sparkles, Lock, Mail, Server, Zap, CheckCircle2 } from "lucide-react";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { store } from "@/lib/data/storage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("mandaveatharva123@gmail.com");
  const [password, setPassword] = useState("Atharva@123");
  const [isLoading, setIsLoading] = useState(false);
  const [isQuickLoading, setIsQuickLoading] = useState(false);
  const hasSupabase = isSupabaseConfigured();

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!hasSupabase) {
      toast.info("Supabase is not configured yet. Continuing with local ledger.");
      router.push("/dashboard");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      toast.error("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    const supabase = getSupabaseBrowserClient();
    try {
      let { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      // If email not confirmed in Supabase, auto-confirm and retry
      if (error && (error.message || "").toLowerCase().includes("email not confirmed")) {
        const confirmRes = await fetch("/api/auth/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail }),
        });
        if (confirmRes.ok) {
          const retry = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPassword,
          });
          data = retry.data;
          error = retry.error;
        }
      }

      if (error) {
        toast.error(error.message);
      } else {
        if (data?.user) {
          await store.loadUserDataFromSupabase(data.user);
        }
        toast.success("Welcome back to Daybook!");
        window.location.href = "/dashboard";
      }
    } catch (err) {
      console.error("Sign in exception:", err);
      toast.error(err?.message || "Failed to sign in.");
    } finally {
      setIsLoading(false);
    }
  };

  // 1-Click Instant Sign In
  const handleQuickSignIn = async () => {
    setIsQuickLoading(true);
    try {
      const res = await fetch("/api/auth/quick-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "mandaveatharva123@gmail.com",
          password: "Atharva@123",
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Quick login failed.");
        setIsQuickLoading(false);
        return;
      }

      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: json.email,
          password: json.password,
        });

        if (authError) {
          toast.error(authError.message);
          setIsQuickLoading(false);
          return;
        }

        if (authData?.user) {
          await store.loadUserDataFromSupabase(authData.user);
        }
      }

      toast.success("Signed in as Atharva Mandave! Cloud DB active.");
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Quick sign in error:", err);
      toast.error("Quick sign in failed: " + (err.message || "Network error"));
      setIsQuickLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 selection:bg-forest-100 selection:text-forest-900">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-10 w-10 rounded-xl bg-forest-500 items-center justify-center text-white font-serif font-bold text-xl shadow-subtle mx-auto">
            D
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Sign in to Daybook
          </h1>
          <p className="text-xs text-muted-foreground">
            Know where your money goes.
          </p>
        </div>

        {/* Auth Card */}
        <Card className="p-6 space-y-4">
          {/* Quick Sign In Option */}
          <div className="pb-3 border-b border-border space-y-2">
            <Button
              type="button"
              variant="default"
              size="default"
              onClick={handleQuickSignIn}
              disabled={isQuickLoading || isLoading}
              className="w-full gap-2 bg-forest-700 hover:bg-forest-800 text-white font-medium shadow-subtle"
            >
              <Zap className="h-4 w-4 fill-current text-emerald-300" />
              <span>{isQuickLoading ? "Authenticating..." : "1-Click Sign In (Atharva Mandave)"}</span>
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              Instantly connects to your live Supabase database.
            </p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Email address
              </label>
              <Input
                type="email"
                placeholder="mandaveatharva123@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required={hasSupabase}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-foreground">
                  Password
                </label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  Default: Atharva@123
                </span>
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={hasSupabase}
              />
            </div>

            <Button
              type="submit"
              variant="default"
              size="default"
              className="w-full font-medium"
              disabled={isLoading || isQuickLoading}
            >
              {isLoading ? "Signing in..." : "Sign In with Credentials"}
            </Button>
          </form>

          <div className="pt-2 border-t border-border text-center">
            <p className="text-[11px] text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-forest-700 font-semibold hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </Card>

        {/* Backend Status Footer */}
        <div className="text-center">
          <Badge variant={hasSupabase ? "income" : "outline"} className="text-[10px]">
            {hasSupabase ? "Supabase PostgreSQL Connected" : "Local Ledger Storage"}
          </Badge>
        </div>
      </div>
    </div>
  );
}
