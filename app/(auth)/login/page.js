"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Sparkles, Lock, Mail, Server } from "lucide-react";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const hasSupabase = isSupabaseConfigured();

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!hasSupabase) {
      toast.info("Supabase is not configured yet. Launching in Demo Mode with full capabilities.");
      router.push("/dashboard");
      return;
    }

    setIsLoading(true);
    const supabase = getSupabaseBrowserClient();
    try {
      let { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // If email not confirmed in Supabase, auto-confirm and retry
      if (error && error.message.toLowerCase().includes("email not confirmed")) {
        const confirmRes = await fetch("/api/auth/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        if (confirmRes.ok) {
          const retry = await supabase.auth.signInWithPassword({ email, password });
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
      toast.error("Failed to sign in.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnterDemo = () => {
    toast.success("Welcome to Daybook Demo Mode.");
    router.push("/dashboard");
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
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Email address
              </label>
              <Input
                type="email"
                placeholder="name@example.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required={hasSupabase}
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
                required={hasSupabase}
              />
            </div>

            <Button
              type="submit"
              variant="default"
              size="default"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : hasSupabase ? "Sign In" : "Sign In with Credentials"}
            </Button>
          </form>

          {/* Quick Demo Access Button */}
          <div className="pt-2 border-t border-border space-y-2">
            <Button
              type="button"
              variant="subtle"
              size="default"
              onClick={handleEnterDemo}
              className="w-full gap-2"
            >
              <Sparkles className="h-4 w-4 text-forest-600" />
              <span>Explore Demo Mode (INR ₹)</span>
            </Button>

            <p className="text-[11px] text-muted-foreground text-center">
              Don't have an account?{" "}
              <Link href="/signup" className="text-forest-700 font-semibold hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </Card>

        {/* Backend Status Footer */}
        <div className="text-center">
          <Badge variant={hasSupabase ? "income" : "outline"} className="text-[10px]">
            {hasSupabase ? "Supabase Auth Active" : "Demo Mode Fallback Ready"}
          </Badge>
        </div>
      </div>
    </div>
  );
}
