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
