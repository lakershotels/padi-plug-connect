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

export const listDisputes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { data: disputes } = await supabase
      .from("disputes")
      .select("id,order_id,opened_by,reason,evidence_urls,status,admin_notes,created_at,updated_at")
      .order("created_at", { ascending: false });
    const list = disputes ?? [];
    if (list.length === 0) return [];
    const orderIds = list.map((d) => d.order_id);
    const openerIds = Array.from(new Set(list.map((d) => d.opened_by)));
    const { data: orders } = await supabase
      .from("orders")
      .select("id,kind,status,total_kobo,currency,customer_id,vendor_id,artisan_id,vendors(store_name),artisans(display_name)")
      .in("id", orderIds);
    const { data: profs } = await supabase.from("profiles").select("id,full_name").in("id", openerIds);
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
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { data: dispute } = await supabase.from("disputes").select("*").eq("id", data.disputeId).maybeSingle();
    if (!dispute) throw new Error("Dispute not found");
    if (dispute.status !== "open" && dispute.status !== "investigating") {
      throw new Error("Dispute already resolved");
    }
    const { data: order } = await supabase.from("orders").select("*").eq("id", dispute.order_id).maybeSingle();
    if (!order) throw new Error("Order not found");

    // Provider owner
    let providerUserId: string | null = null;
    if (order.vendor_id) {
      const { data: v } = await supabase.from("vendors").select("owner_id").eq("id", order.vendor_id).maybeSingle();
      providerUserId = v?.owner_id ?? null;
    } else if (order.artisan_id) {
      const { data: a } = await supabase.from("artisans").select("owner_id").eq("id", order.artisan_id).maybeSingle();
      providerUserId = a?.owner_id ?? null;
    }

    const customerId = order.customer_id as string;
    const total = order.total_kobo as number;
    const commission = (order.commission_kobo as number) ?? 0;

    // Move escrow out on customer wallet
    const { data: cw } = await supabase.from("wallets").select("balance_kobo,escrow_kobo").eq("user_id", customerId).maybeSingle();
    const newEscrow = Math.max(0, (cw?.escrow_kobo ?? 0) - total);

    if (data.decision === "refund") {
      const newBalance = (cw?.balance_kobo ?? 0) + total;
      await supabase.from("wallets").update({ balance_kobo: newBalance, escrow_kobo: newEscrow }).eq("user_id", customerId);
      await supabase.from("wallet_transactions").insert({
        user_id: customerId, type: "refund", amount_kobo: total, balance_after_kobo: newBalance,
        description: "Dispute refund", order_id: order.id,
      });
      await supabase.from("orders").update({ status: "resolved_refund", completed_at: new Date().toISOString() }).eq("id", order.id);
      await supabase.from("disputes").update({ status: "resolved_refund", admin_notes: data.notes }).eq("id", dispute.id);
      await supabase.from("notifications").insert([
        { user_id: customerId, title: "Dispute resolved — refunded", body: "Funds returned to your wallet.", link: `/orders/${order.id}` },
        ...(providerUserId ? [{ user_id: providerUserId, title: "Dispute resolved — refunded", body: "Escrow was refunded to the customer.", link: `/orders/${order.id}` }] : []),
      ] as any);
    } else {
      // release to provider
      await supabase.from("wallets").update({ escrow_kobo: newEscrow }).eq("user_id", customerId);
      if (!providerUserId) throw new Error("Provider not found");
      await supabase.from("wallets").upsert({ user_id: providerUserId }, { onConflict: "user_id" });
      const { data: pw } = await supabase.from("wallets").select("balance_kobo").eq("user_id", providerUserId).maybeSingle();
      const payout = total - commission;
      const newPBal = (pw?.balance_kobo ?? 0) + payout;
      await supabase.from("wallets").update({ balance_kobo: newPBal }).eq("user_id", providerUserId);
      await supabase.from("wallet_transactions").insert([
        { user_id: customerId, type: "release", amount_kobo: -total, description: "Dispute release to seller", order_id: order.id },
        { user_id: providerUserId, type: "release", amount_kobo: payout, balance_after_kobo: newPBal, description: "Dispute release payout", order_id: order.id },
        { user_id: providerUserId, type: "commission", amount_kobo: -commission, description: "PadiPlug commission", order_id: order.id },
      ]);
      await supabase.from("orders").update({ status: "resolved_release", completed_at: new Date().toISOString() }).eq("id", order.id);
      await supabase.from("disputes").update({ status: "resolved_release", admin_notes: data.notes }).eq("id", dispute.id);
      await supabase.from("notifications").insert([
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
    await context.supabase.from("disputes")
      .update({ status: "investigating", admin_notes: data.notes })
      .eq("id", data.disputeId);
    return { ok: true };
  });
