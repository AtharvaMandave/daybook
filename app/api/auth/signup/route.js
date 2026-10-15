import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      fullName,
      currency = "INR",
      paydayDay = 30,
      accountName = "Primary Account",
      accountType = "checking",
      openingBalance = 0,
    } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const adminClient = getSupabaseAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { error: "Supabase Admin is not configured on the server." },
        { status: 500 }
      );
    }

    // 1. Check if user already exists
    const { data: usersList } = await adminClient.auth.admin.listUsers();
    let user = usersList?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (user) {
      // Update password & auto-confirm email
      const { data: updated, error: updateErr } =
        await adminClient.auth.admin.updateUserById(user.id, {
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName || user.user_metadata?.full_name || "User",
            currency,
            payday_day_of_month: parseInt(paydayDay, 10) || 30,
          },
        });

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 400 });
      }
      user = updated.user;
    } else {
      // Create fresh user with auto-confirmed email
      const { data: created, error: createErr } =
        await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName || "User",
            currency,
            payday_day_of_month: parseInt(paydayDay, 10) || 30,
          },
        });

      if (createErr) {
        return NextResponse.json({ error: createErr.message }, { status: 400 });
      }
      user = created.user;
    }

    // 2. Provision Profile
    const parsedPayday = parseInt(paydayDay, 10) || 30;
    const parsedOpening = parseFloat(openingBalance) || 0;

    await adminClient.from("profiles").upsert({
      id: user.id,
      full_name: fullName || user.user_metadata?.full_name || "User",
      currency,
      payday_day_of_month: parsedPayday,
      is_payday_configured: true,
      expected_payday_income: parsedOpening > 0 ? parsedOpening * 2 : 100000,
    });

    // 3. Provision Initial Primary Account
    const { data: existingAccounts } = await adminClient
      .from("accounts")
      .select("id")
      .eq("user_id", user.id);

    if (!existingAccounts || existingAccounts.length === 0) {
      await adminClient.from("accounts").insert({
        user_id: user.id,
        name: accountName || "Primary Account",
        type: accountType || "checking",
        opening_balance: parsedOpening,
        current_balance: parsedOpening,
        include_in_net_worth: true,
        is_archived: false,
        color: "#456B50",
      });
    }

    // 4. Provision Default Categories
    const { data: existingCats } = await adminClient
      .from("categories")
      .select("id")
      .eq("user_id", user.id);

    if (!existingCats || existingCats.length === 0) {
      const defaultCategories = [
        { user_id: user.id, name: "Food & Dining", type: "expense", color: "#D97706" },
        { user_id: user.id, name: "Groceries", type: "expense", color: "#059669" },
        { user_id: user.id, name: "Transportation", type: "expense", color: "#2563EB" },
        { user_id: user.id, name: "Housing & Rent", type: "expense", color: "#DC2626" },
        { user_id: user.id, name: "Utilities & Bills", type: "expense", color: "#7C3AED" },
        { user_id: user.id, name: "Subscriptions & Entertainment", type: "expense", color: "#DB2777" },
        { user_id: user.id, name: "Shopping", type: "expense", color: "#EA580C" },
        { user_id: user.id, name: "Health & Wellness", type: "expense", color: "#0D9488" },
        { user_id: user.id, name: "Investments & SIP", type: "expense", color: "#4F46E5" },
        { user_id: user.id, name: "Salary & Professional Income", type: "income", color: "#16A34A" },
        { user_id: user.id, name: "Other Income", type: "income", color: "#65A30D" },
      ];
      await adminClient.from("categories").insert(defaultCategories);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: fullName || user.user_metadata?.full_name,
      },
    });
  } catch (err) {
    console.error("Signup API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to complete signup." },
      { status: 500 }
    );
  }
}
