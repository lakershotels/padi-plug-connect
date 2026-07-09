import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getWalletBalance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("wallets").upsert({ user_id: context.userId }, { onConflict: "user_id" });
    const { data } = await supabaseAdmin.from("wallets").select("balance_kobo,escrow_kobo,currency").eq("user_id", context.userId).maybeSingle();
    return data ?? { balance_kobo: 0, escrow_kobo: 0, currency: "NGN" };
  });

export const getWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("wallets").upsert({ user_id: context.userId }, { onConflict: "user_id" });
    const [{ data: wallet }, { data: txns }] = await Promise.all([
      supabaseAdmin.from("wallets").select("*").eq("user_id", context.userId).maybeSingle(),
      supabaseAdmin.from("wallet_transactions").select("*").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(50),
    ]);
    return { wallet, txns: txns ?? [] };
  });

export const simulateFund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ amountNaira: z.number().positive().max(1000000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;
    const amountKobo = Math.round(data.amountNaira * 100);

    // Ensure wallet row exists
    await supabaseAdmin.from("wallets").upsert({ user_id: userId }, { onConflict: "user_id" });
    const { data: w, error: readErr } = await supabaseAdmin
      .from("wallets").select("balance_kobo").eq("user_id", userId).maybeSingle();
    if (readErr) throw new Error(readErr.message);

    const newBal = (w?.balance_kobo ?? 0) + amountKobo;
    const { error: updErr } = await supabaseAdmin
      .from("wallets")
      .update({ balance_kobo: newBal, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    if (updErr) throw new Error(updErr.message);

    const { error: txErr } = await supabaseAdmin.from("wallet_transactions").insert({
      user_id: userId,
      type: "fund",
      amount_kobo: amountKobo,
      balance_after_kobo: newBal,
      description: "Simulated wallet top-up (Paystack coming soon)",
    });
    if (txErr) throw new Error(txErr.message);

    return { balance_kobo: newBal };
  });
