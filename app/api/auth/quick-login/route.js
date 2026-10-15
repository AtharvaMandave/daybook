import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const cleanEmail = (body.email || "mandaveatharva123@gmail.com").trim().toLowerCase();
    const cleanPassword = body.password || "Atharva@123";

    const adminClient = getSupabaseAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { error: "Supabase Admin client is not configured." },
        { status: 500 }
      );
    }

    // 1. Find user by email
    const { data: usersList } = await adminClient.auth.admin.listUsers();
    let user = usersList?.users?.find(
      (u) => u.email?.toLowerCase() === cleanEmail
    );

    if (!user) {
      // If user doesn't exist yet, create them auto-confirmed
      const { data: created, error: createErr } =
        await adminClient.auth.admin.createUser({
          email: cleanEmail,
          password: cleanPassword,
          email_confirm: true,
          user_metadata: {
            full_name: "Atharva Mandave",
            currency: "INR",
            payday_day_of_month: 30,
          },
        });

      if (createErr) {
        return NextResponse.json({ error: createErr.message }, { status: 400 });
      }
      user = created.user;
    } else {
      // Update password and confirm email
      await adminClient.auth.admin.updateUserById(user.id, {
        password: cleanPassword,
        email_confirm: true,
      });
    }

    // 2. Ensure Profile exists
    await adminClient.from("profiles").upsert({
      id: user.id,
      full_name: user.user_metadata?.full_name || "Atharva Mandave",
      currency: "INR",
      payday_day_of_month: 30,
      is_payday_configured: true,
      expected_payday_income: 100000,
    });

    // 3. Ensure Primary Account exists
    const { data: existingAccounts } = await adminClient
      .from("accounts")
      .select("id")
      .eq("user_id", user.id);

    if (!existingAccounts || existingAccounts.length === 0) {
      await adminClient.from("accounts").insert({
        user_id: user.id,
        name: "Primary Salary Account",
        type: "checking",
        opening_balance: 50000,
        current_balance: 50000,
        include_in_net_worth: true,
        is_archived: false,
        color: "#456B50",
      });
    }

    return NextResponse.json({
      success: true,
      email: cleanEmail,
      password: cleanPassword,
      userId: user.id,
    });
  } catch (err) {
    console.error("Quick login error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to prepare quick login." },
      { status: 500 }
    );
  }
}
