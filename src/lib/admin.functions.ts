import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  const { data: sa } = await supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" });
  if (!data && !sa) throw new Error("Forbidden");
}

async function assertSuperAdmin(supabase: any, userId: string) {
  const { data: sa } = await supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" });
  if (!sa) throw new Error("Super admin only");
}

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const [users, vendors, artisans, products, orders, disputes, escrow] = await Promise.all([
      db.from("profiles").select("*", { count: "exact", head: true }),
      db.from("vendors").select("id,slug,store_name,verification,city,rating_avg,created_at").order("created_at", { ascending: false }).limit(50),
      db.from("artisans").select("id,slug,display_name,profession,verification,city,rating_avg,created_at").order("created_at", { ascending: false }).limit(50),
      db.from("products").select("*", { count: "exact", head: true }),
      db.from("orders").select("id,kind,total_kobo,commission_kobo,status,created_at,customer_id,vendors(store_name),artisans(display_name)").order("created_at", { ascending: false }).limit(50),
      db.from("disputes").select("*").order("created_at", { ascending: false }).limit(50),
      db.from("orders").select("total_kobo,commission_kobo,status"),
    ]);
    const allOrders = escrow.data ?? [];
    const gmv = allOrders.reduce((s, o: any) => s + (o.total_kobo ?? 0), 0);
    const inEscrow = allOrders
      .filter((o: any) => ["paid_escrow", "fulfilled", "disputed"].includes(o.status))
      .reduce((s, o: any) => s + (o.total_kobo ?? 0), 0);
    const revenue = allOrders
      .filter((o: any) => ["released", "completed", "resolved_release"].includes(o.status))
      .reduce((s, o: any) => s + (o.commission_kobo ?? 0), 0);
    return {
      counts: {
        users: users.count ?? 0,
        vendors: (vendors.data ?? []).length,
        artisans: (artisans.data ?? []).length,
        products: products.count ?? 0,
        orders: allOrders.length,
        disputes: (disputes.data ?? []).filter((d: any) => d.status === "open" || d.status === "investigating").length,
        gmv,
        inEscrow,
        revenue,
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
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: vendor } = await db.from("vendors").select("owner_id,store_name").eq("id", data.id).maybeSingle();
    await db.from("vendors").update({ verification: data.verification as any }).eq("id", data.id);
    if (vendor) {
      await db.from("notifications").insert({
        user_id: vendor.owner_id,
        title: `Store ${data.verification}`,
        body: `${vendor.store_name} is now ${data.verification}.`,
        link: "/vendor",
      });
    }
    return { ok: true };
  });

export const setArtisanVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => ({ id: String(d.id), verification: String(d.verification) as "unverified" | "pending" | "verified" | "rejected" }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: artisan } = await db.from("artisans").select("owner_id,display_name").eq("id", data.id).maybeSingle();
    await db.from("artisans").update({ verification: data.verification as any }).eq("id", data.id);
    if (artisan) {
      await db.from("notifications").insert({
        user_id: artisan.owner_id,
        title: `Profile ${data.verification}`,
        body: `${artisan.display_name} is now ${data.verification}.`,
        link: "/artisan",
      });
    }
    return { ok: true };
  });

export const isAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: a } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const { data: sa } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" });
    return { isAdmin: !!(a || sa), isSuperAdmin: !!sa };
  });

export const listUsersWithRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: profiles } = await db
      .from("profiles")
      .select("id,full_name,city,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    const ids = (profiles ?? []).map((p) => p.id);
    if (ids.length === 0) return [];
    const [{ data: roles }, { data: wallets }] = await Promise.all([
      db.from("user_roles").select("user_id,role").in("user_id", ids),
      db.from("wallets").select("user_id,balance_kobo,escrow_kobo").in("user_id", ids),
    ]);
    const roleMap = new Map<string, string[]>();
    (roles ?? []).forEach((r: any) => {
      roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), r.role]);
    });
    const walletMap = new Map((wallets ?? []).map((w: any) => [w.user_id, w]));
    return (profiles ?? []).map((p) => ({
      ...p,
      roles: roleMap.get(p.id) ?? [],
      wallet: walletMap.get(p.id) ?? null,
    }));
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      userId: z.string().uuid(),
      role: z.enum(["customer", "vendor", "artisan", "logistics", "admin", "super_admin"]),
      grant: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // Only super admins can change admin-level roles
    if (data.role === "admin" || data.role === "super_admin") {
      await assertSuperAdmin(context.supabase, context.userId);
    } else {
      await assertAdmin(context.supabase, context.userId);
    }
    if (data.userId === context.userId && !data.grant && (data.role === "admin" || data.role === "super_admin")) {
      throw new Error("You cannot remove your own admin role");
    }
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    if (data.grant) {
      const { error } = await db.from("user_roles").upsert(
        { user_id: data.userId, role: data.role as any },
        { onConflict: "user_id,role" },
      );
      if (error) throw new Error(error.message);
    } else {
      const { error } = await db.from("user_roles").delete().eq("user_id", data.userId).eq("role", data.role as any);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const listDisputes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: disputes } = await db
      .from("disputes")
      .select("id,order_id,opened_by,reason,evidence_urls,status,admin_notes,created_at,updated_at")
      .order("created_at", { ascending: false });
    const list = disputes ?? [];
    if (list.length === 0) return [];
    const orderIds = list.map((d) => d.order_id);
    const openerIds = Array.from(new Set(list.map((d) => d.opened_by)));
    const { data: orders } = await db
      .from("orders")
      .select("id,kind,status,total_kobo,currency,customer_id,vendor_id,artisan_id,vendors(store_name),artisans(display_name)")
      .in("id", orderIds);
    const { data: profs } = await db.from("profiles").select("id,full_name").in("id", openerIds);
    const orderMap = new Map((orders ?? []).map((o: any) => [o.id, o]));
    const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
    return list.map((d) => ({
      ...d,
      order: orderMap.get(d.order_id) ?? null,
      opener: profMap.get(d.opened_by) ?? null,
    }));
  });

export const resolveDispute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => ({
    disputeId: String(d.disputeId),
    decision: String(d.decision) as "refund" | "release",
    notes: d.notes ? String(d.notes) : "",
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");

    const { data: dispute } = await db.from("disputes").select("*").eq("id", data.disputeId).maybeSingle();
    if (!dispute) throw new Error("Dispute not found");
    if (dispute.status !== "open" && dispute.status !== "investigating") {
      throw new Error("Dispute already resolved");
    }
    const { data: order } = await db.from("orders").select("*").eq("id", dispute.order_id).maybeSingle();
    if (!order) throw new Error("Order not found");

    let providerUserId: string | null = null;
    if (order.vendor_id) {
      const { data: v } = await db.from("vendors").select("owner_id").eq("id", order.vendor_id).maybeSingle();
      providerUserId = v?.owner_id ?? null;
    } else if (order.artisan_id) {
      const { data: a } = await db.from("artisans").select("owner_id").eq("id", order.artisan_id).maybeSingle();
      providerUserId = a?.owner_id ?? null;
    }

    const customerId = order.customer_id as string;
    const total = order.total_kobo as number;
    const commission = (order.commission_kobo as number) ?? 0;

    const { data: cw } = await db.from("wallets").select("balance_kobo,escrow_kobo").eq("user_id", customerId).maybeSingle();
    const newEscrow = Math.max(0, (cw?.escrow_kobo ?? 0) - total);

    if (data.decision === "refund") {
      const newBalance = (cw?.balance_kobo ?? 0) + total;
      await db.from("wallets").update({ balance_kobo: newBalance, escrow_kobo: newEscrow, updated_at: new Date().toISOString() }).eq("user_id", customerId);
      await db.from("wallet_transactions").insert({
        user_id: customerId, type: "refund", amount_kobo: total, balance_after_kobo: newBalance,
        description: "Dispute refund", order_id: order.id,
      });
      await db.from("orders").update({ status: "resolved_refund", completed_at: new Date().toISOString() }).eq("id", order.id);
      await db.from("disputes").update({ status: "resolved_refund", admin_notes: data.notes }).eq("id", dispute.id);
      await db.from("notifications").insert([
        { user_id: customerId, title: "Dispute resolved — refunded", body: "Funds returned to your wallet.", link: `/orders/${order.id}` },
        ...(providerUserId ? [{ user_id: providerUserId, title: "Dispute resolved — refunded", body: "Escrow was refunded to the customer.", link: `/orders/${order.id}` }] : []),
      ] as any);
    } else {
      await db.from("wallets").update({ escrow_kobo: newEscrow, updated_at: new Date().toISOString() }).eq("user_id", customerId);
      if (!providerUserId) throw new Error("Provider not found");
      await db.from("wallets").upsert({ user_id: providerUserId }, { onConflict: "user_id" });
      const { data: pw } = await db.from("wallets").select("balance_kobo").eq("user_id", providerUserId).maybeSingle();
      const payout = total - commission;
      const newPBal = (pw?.balance_kobo ?? 0) + payout;
      await db.from("wallets").update({ balance_kobo: newPBal, updated_at: new Date().toISOString() }).eq("user_id", providerUserId);
      await db.from("wallet_transactions").insert([
        { user_id: customerId, type: "release", amount_kobo: -total, description: "Dispute release to seller", order_id: order.id },
        { user_id: providerUserId, type: "release", amount_kobo: payout, balance_after_kobo: newPBal, description: "Dispute release payout", order_id: order.id },
        { user_id: providerUserId, type: "commission", amount_kobo: -commission, description: "PadiPlug commission", order_id: order.id },
      ]);
      await db.from("orders").update({ status: "resolved_release", completed_at: new Date().toISOString() }).eq("id", order.id);
      await db.from("disputes").update({ status: "resolved_release", admin_notes: data.notes }).eq("id", dispute.id);
      await db.from("notifications").insert([
        { user_id: customerId, title: "Dispute resolved — released", body: "Escrow was released to the seller.", link: `/orders/${order.id}` },
        { user_id: providerUserId, title: "Dispute resolved — released", body: "Escrow released to your wallet.", link: `/orders/${order.id}` },
      ]);
    }
    return { ok: true };
  });

export const setDisputeInvestigating = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => ({ disputeId: String(d.disputeId), notes: d.notes ? String(d.notes) : "" }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    await db.from("disputes")
      .update({ status: "investigating", admin_notes: data.notes })
      .eq("id", data.disputeId);
    return { ok: true };
  });
