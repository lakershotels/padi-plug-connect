import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  const { data: sa } = await supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" });
  if (!data && !sa) throw new Error("Forbidden");
}

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const [users, vendors, artisans, products, orders, disputes] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("vendors").select("id,slug,store_name,verification,city,rating_avg,created_at").order("created_at", { ascending: false }).limit(50),
      supabase.from("artisans").select("id,slug,display_name,profession,verification,city,rating_avg,created_at").order("created_at", { ascending: false }).limit(50),
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("id,total_kobo,status,created_at,customer_id").order("created_at", { ascending: false }).limit(50),
      supabase.from("disputes").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    const gmv = (orders.data ?? []).reduce((s, o: any) => s + (o.total_kobo ?? 0), 0);
    return {
      counts: {
        users: users.count ?? 0,
        vendors: (vendors.data ?? []).length,
        artisans: (artisans.data ?? []).length,
        products: products.count ?? 0,
        orders: (orders.data ?? []).length,
        disputes: (disputes.data ?? []).length,
        gmv,
      },
      vendors: vendors.data ?? [],
      artisans: artisans.data ?? [],
      orders: orders.data ?? [],
      disputes: disputes.data ?? [],
    };
  });

export const setVendorVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => ({ id: String(d.id), verification: String(d.verification) as "unverified" | "pending" | "verified" | "rejected" }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    await context.supabase.from("vendors").update({ verification: data.verification as any }).eq("id", data.id);
    return { ok: true };
  });

export const setArtisanVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => ({ id: String(d.id), verification: String(d.verification) as "unverified" | "pending" | "verified" | "rejected" }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    await context.supabase.from("artisans").update({ verification: data.verification as any }).eq("id", data.id);
    return { ok: true };
  });

export const isAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: a } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const { data: sa } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" });
    return { isAdmin: !!(a || sa) };
  });
