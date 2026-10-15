import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const adminClient = getSupabaseAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { error: "Supabase admin client unavailable." },
        { status: 500 }
      );
    }

    const { data: usersList } = await adminClient.auth.admin.listUsers();
    const user = usersList?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const { data: updated, error } = await adminClient.auth.admin.updateUserById(
      user.id,
      { email_confirm: true }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, confirmedAt: updated.user.email_confirmed_at });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Failed to confirm user." },
      { status: 500 }
    );
  }
}
