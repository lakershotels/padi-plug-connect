import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export const getWalletBalance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    await db.from("wallets").upsert({ user_id: context.userId }, { onConflict: "user_id" });
    const { data } = await db
      .from("wallets")
      .select("balance_kobo,escrow_kobo,pending_kobo,currency")
      .eq("user_id", context.userId)
      .maybeSingle();
    return data ?? { balance_kobo: 0, escrow_kobo: 0, pending_kobo: 0, currency: "NGN" };
  });

export const getWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const userId = context.userId;
    await db.from("wallets").upsert({ user_id: userId }, { onConflict: "user_id" });
    await db.rpc("escrow_sweep_overdue");

    const [{ data: wallet }, { data: txns }, { data: payments }, { data: receipts }, { data: withdrawals }, { data: escrowIn }, { data: escrowOut }] =
      await Promise.all([
        db.from("wallets").select("*").eq("user_id", userId).maybeSingle(),
        db.from("wallet_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
        db.from("payments").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
        db.from("receipts").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
        db.from("withdrawals").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
        db.from("escrow_transactions").select("*").eq("customer_id", userId).order("created_at", { ascending: false }).limit(50),
        db.from("escrow_transactions").select("*").eq("seller_id", userId).order("created_at", { ascending: false }).limit(50),
      ]);

    const escrow = [...(escrowIn ?? []), ...(escrowOut ?? [])].sort(
      (a: any, b: any) => +new Date(b.created_at) - +new Date(a.created_at),
    );

    return {
      wallet,
      txns: txns ?? [],
      payments: payments ?? [],
      receipts: receipts ?? [],
      withdrawals: withdrawals ?? [],
      escrow,
    };
  });

const METHODS = ["bank_transfer", "card", "apple_pay", "google_pay", "virtual_account"] as const;

/**
 * Sandbox funding: creates a payment record with a unique reference and credits
 * the wallet atomically. Swap the provider call in once Paystack/Monnify keys land —
 * the ledger side stays identical.
 */
export const fundWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        amountNaira: z.number().positive().max(5_000_000),
        method: z.enum(METHODS).default("card"),
        reference: z.string().min(6).max(64).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    const amountKobo = Math.round(data.amountNaira * 100);
    const reference = data.reference ?? `PP-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const { data: result, error } = await db.rpc("wallet_fund", {
      _user_id: context.userId,
      _amount_kobo: amountKobo,
      _reference: reference,
      _method: data.method,
      _description: `Wallet top-up via ${data.method.replace(/_/g, " ")}`,
    });
    if (error) {
      if (String(error.message).includes("Duplicate")) throw new Error("This payment was already credited.");
      throw new Error(error.message);
    }

    await db.from("notifications").insert({
      user_id: context.userId,
      title: "Wallet funded",
      body: `₦${data.amountNaira.toLocaleString()} added to your wallet.`,
      link: "/wallet",
    });

    return result as { balance_kobo: number; payment_id: string; receipt_no: string; reference: string };
  });

// Back-compat alias used by older screens.
export const simulateFund = fundWallet;

export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        amountNaira: z.number().positive().max(5_000_000),
        bankName: z.string().min(2).max(80),
        accountNumber: z.string().min(6).max(20),
        accountName: z.string().min(2).max(80),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    const userId = context.userId;
    const amountKobo = Math.round(data.amountNaira * 100);

    const { data: wallet } = await db.from("wallets").select("balance_kobo,pending_kobo").eq("user_id", userId).maybeSingle();
    if (!wallet || wallet.balance_kobo < amountKobo) throw new Error("Insufficient available balance");

    const newBal = wallet.balance_kobo - amountKobo;
    await db
      .from("wallets")
      .update({ balance_kobo: newBal, pending_kobo: (wallet.pending_kobo ?? 0) + amountKobo, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    const { data: wd, error } = await db
      .from("withdrawals")
      .insert({
        user_id: userId,
        amount_kobo: amountKobo,
        destination: { bank_name: data.bankName, account_number: data.accountNumber, account_name: data.accountName },
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await db.from("wallet_transactions").insert({
      user_id: userId,
      type: "withdrawal",
      amount_kobo: -amountKobo,
      balance_after_kobo: newBal,
      reference: `WD-${String(wd.id).slice(0, 8).toUpperCase()}`,
      description: `Withdrawal to ${data.bankName} ${data.accountNumber}`,
    });
    await db.from("audit_logs").insert({
      actor_id: userId,
      action: "withdrawal.requested",
      entity: "withdrawal",
      entity_id: wd.id,
      meta: { amount_kobo: amountKobo },
    });
    await db.from("notifications").insert({
      user_id: userId,
      title: "Withdrawal requested",
      body: "We are processing your payout. You'll be notified when it's paid.",
      link: "/wallet",
    });
    return { ok: true, withdrawalId: wd.id };
  });
