import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
    return data ?? [];
  });

export const markAllRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    return { ok: true };
  });

export const getFavorites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("favorites")
      .select("id,created_at,products(id,title,images,price_kobo,vendors(store_name)),vendors!favorites_vendor_id_fkey(id,slug,store_name,logo_url),artisans(id,slug,display_name,avatar_url)")
      .order("created_at", { ascending: false });
    return data ?? [];
  });

export const toggleFavoriteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ productId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase.from("favorites").select("id").eq("user_id", userId).eq("product_id", data.productId).maybeSingle();
    if (existing) {
      await supabase.from("favorites").delete().eq("id", existing.id);
      return { favorited: false };
    }
    await supabase.from("favorites").insert({ user_id: userId, product_id: data.productId });
    return { favorited: true };
  });

/** Permanently delete the signed-in user's account (App Store / Play Store requirement). */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ confirm: z.literal("DELETE") }).parse(d))
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance_kobo,escrow_kobo,pending_kobo")
      .eq("user_id", userId)
      .maybeSingle();
    if (wallet && (wallet.escrow_kobo ?? 0) > 0) {
      throw new Error("You still have funds locked in escrow. Complete or resolve those orders first.");
    }
    if (wallet && (wallet.balance_kobo ?? 0) > 0) {
      throw new Error("Withdraw your wallet balance before deleting your account.");
    }

    const { data: openOrders } = await supabase
      .from("orders")
      .select("id")
      .eq("customer_id", userId)
      .in("status", ["pending_payment", "paid_escrow", "fulfilled", "disputed"])
      .limit(1);
    if (openOrders && openOrders.length > 0) {
      throw new Error("You have orders in progress. Finish or cancel them before deleting your account.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("profiles")
      .update({ full_name: "Deleted user", phone: null, avatar_url: null, bio: null, city: null })
      .eq("id", userId);
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: userId,
      action: "account.delete",
      entity: "user",
      entity_id: userId,
      meta: {},
    });

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
