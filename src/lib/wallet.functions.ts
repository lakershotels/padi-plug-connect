import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase.from("wallets").upsert({ user_id: userId }, { onConflict: "user_id" });
    const [{ data: wallet }, { data: txns }] = await Promise.all([
      supabase.from("wallets").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("wallet_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    ]);
    return { wallet, txns: txns ?? [] };
  });

export const simulateFund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ amountNaira: z.number().positive().max(1000000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const amountKobo = Math.round(data.amountNaira * 100);
    const { data: w } = await supabase.from("wallets").select("balance_kobo").eq("user_id", userId).maybeSingle();
    const newBal = (w?.balance_kobo ?? 0) + amountKobo;
    await supabase.from("wallets").upsert({ user_id: userId, balance_kobo: newBal }, { onConflict: "user_id" });
    await supabase.from("wallet_transactions").insert({
      user_id: userId, type: "fund", amount_kobo: amountKobo, balance_after_kobo: newBal,
      description: "Simulated wallet top-up (Paystack coming soon)",
    });
    return { balance_kobo: newBal };
  });
