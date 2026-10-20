import { NextResponse } from "next/server";
import { getSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { transactionSchema } from "@/lib/validation/schemas";

export async function GET(request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({
      error: "Supabase server is not configured.",
    }, { status: 503 });
  }

  const supabase = getSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("transactions")
    .select("*, transaction_splits(*)")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ transactions: data });
}

export async function POST(request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({
      error: "Supabase server is not configured.",
    }, { status: 503 });
  }

  const supabase = getSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const validated = transactionSchema.parse(json);

    const { splits, ...txData } = validated;

    // Insert transaction
    const { data: tx, error: txError } = await supabase
      .from("transactions")
      .insert({
        ...txData,
        user_id: user.id,
      })
      .select()
      .single();

    if (txError) {
      return NextResponse.json({ error: txError.message }, { status: 500 });
    }

    // Insert splits if any
    if (txData.isSplit && splits?.length) {
      const splitRows = splits.map((s) => ({
        transaction_id: tx.id,
        category: s.category,
        amount: s.amount,
        notes: s.notes || "",
      }));
      await supabase.from("transaction_splits").insert(splitRows);
    }

    return NextResponse.json({ transaction: tx }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Invalid payload" }, { status: 400 });
  }
}
