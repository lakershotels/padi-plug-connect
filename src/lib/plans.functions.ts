import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Plan catalog (kobo). Kept server + client friendly by exporting from a plain module.
export const PLANS = {
  basic:       { code: "basic",       label: "Basic",       price_kobo: 50000,  duration_days: 30,  scope: "profile" as const, desc: "Register, create a profile, list products/services and start receiving orders." },
  premium:     { code: "premium",     label: "Premium",     price_kobo: 250000, duration_days: 30,  scope: "profile" as const, desc: "Boosted placement in search, priority support and a Premium badge on your profile." },
  featured_ad: { code: "featured_ad", label: "Featured Ad", price_kobo: 150000, duration_days: 7,   scope: "spot" as const,    desc: "7 days on the PadiPlug homepage carousel and top of category results." },
} as const;

export type PlanCode = keyof typeof PLANS;

export const listPlans = createServerFn({ method: "GET" }).handler(async () => PLANS);

export const myPurchases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("plan_purchases")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });

export const purchasePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      planCode: z.enum(["basic", "premium", "featured_ad"]),
      scope: z.enum(["vendor", "artisan", "product"]),
      targetId: z.string().uuid(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const plan = PLANS[data.planCode];

    // Verify ownership of the target
    const table = data.scope === "product" ? "products" : data.scope === "vendor" ? "vendors" : "artisans";
    const ownerCol = data.scope === "product" ? "vendor_id" : "owner_id";
    if (data.scope === "product") {
      const { data: p } = await supabase.from("products").select("id,vendor_id,vendors(owner_id)").eq("id", data.targetId).maybeSingle();
      const ownerId = (p as any)?.vendors?.owner_id;
      if (!p || ownerId !== userId) throw new Error("You don't own this product");
    } else {
      const { data: row } = await supabase.from(table as any).select("id,owner_id").eq("id", data.targetId).maybeSingle();
      if (!row || (row as any).owner_id !== userId) throw new Error("You don't own this profile");
    }

    // Debit wallet
    await supabase.from("wallets").upsert({ user_id: userId }, { onConflict: "user_id" });
    const { data: wallet } = await supabase.from("wallets").select("balance_kobo").eq("user_id", userId).maybeSingle();
    const bal = wallet?.balance_kobo ?? 0;
    if (bal < plan.price_kobo) {
      throw new Error(`INSUFFICIENT_WALLET:${plan.price_kobo - bal}`);
    }
    const newBal = bal - plan.price_kobo;
    await supabase.from("wallets").update({ balance_kobo: newBal }).eq("user_id", userId);
    await supabase.from("wallet_transactions").insert({
      user_id: userId,
      type: "commission",
      amount_kobo: -plan.price_kobo,
      balance_after_kobo: newBal,
      description: `${plan.label} plan — ${data.scope}`,
    });

    const starts = new Date();
    const expires = new Date(starts.getTime() + plan.duration_days * 86400_000);

    // Apply the effect
    if (data.planCode === "featured_ad") {
      await supabase.from(table as any).update({ featured_until: expires.toISOString() }).eq("id", data.targetId);
    } else {
      if (data.scope === "vendor" || data.scope === "artisan") {
        await supabase.from(table as any).update({
          plan: data.planCode,
          plan_expires_at: expires.toISOString(),
        }).eq("id", data.targetId);
      }
    }

    await supabase.from("plan_purchases").insert({
      user_id: userId,
      scope: data.scope,
      target_id: data.targetId,
      plan_code: data.planCode,
      amount_kobo: plan.price_kobo,
      duration_days: plan.duration_days,
      starts_at: starts.toISOString(),
      expires_at: expires.toISOString(),
    });

    return { ok: true, expires_at: expires.toISOString(), new_balance_kobo: newBal };
  });
