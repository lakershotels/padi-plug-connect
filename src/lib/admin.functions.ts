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
  .inputValidator((d) =>
    z
      .object({
        disputeId: z.string().uuid(),
        decision: z.enum(["refund", "release", "split", "reject"]),
        splitReleasePercent: z.number().int().min(0).max(100).optional(),
        notes: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");

    const { data: dispute } = await db.from("disputes").select("*").eq("id", data.disputeId).maybeSingle();
    if (!dispute) throw new Error("Dispute not found");
    if (dispute.status !== "open" && dispute.status !== "investigating") throw new Error("Dispute already resolved");

    const { data: order } = await db.from("orders").select("*").eq("id", dispute.order_id).maybeSingle();
    if (!order) throw new Error("Order not found");

    const { data: escrow } = await db
      .from("escrow_transactions")
      .select("*")
      .eq("order_id", order.id)
      .eq("status", "held")
      .maybeSingle();
    if (!escrow) throw new Error("No escrow is held for this order");

    const total = escrow.amount_kobo as number;
    // "reject" means the dispute has no merit -> full release to the seller.
    const releasePercent =
      data.decision === "refund" ? 0 : data.decision === "split" ? (data.splitReleasePercent ?? 50) : 100;
    const releaseKobo = Math.floor((total * releasePercent) / 100);
    const refundKobo = total - releaseKobo;

    const { error } = await db.rpc("escrow_settle", {
      _order_id: order.id,
      _release_kobo: releaseKobo,
      _refund_kobo: refundKobo,
      _actor_id: context.userId,
      _reason: data.notes || `Admin decision: ${data.decision}`,
    });
    if (error) throw new Error(error.message);

    const disputeStatus = refundKobo > 0 && releaseKobo === 0 ? "resolved_refund" : "resolved_release";
    await db
      .from("disputes")
      .update({
        status: disputeStatus as any,
        resolution: data.decision,
        admin_notes: data.notes ?? null,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", dispute.id);

    await db.from("admin_actions").insert({
      admin_id: context.userId,
      action: `dispute.${data.decision}`,
      target_type: "dispute",
      target_id: dispute.id,
      notes: data.notes ?? null,
    });

    const summary =
      data.decision === "split"
        ? `Split settlement: ${releasePercent}% to seller, ${100 - releasePercent}% refunded.`
        : data.decision === "refund"
          ? "Escrow refunded to the customer."
          : data.decision === "reject"
            ? "Dispute rejected — escrow released to the seller."
            : "Escrow released to the seller.";

    const notes: any[] = [{ user_id: order.customer_id, title: "Dispute resolved", body: summary, link: `/orders/${order.id}` }];
    if (escrow.seller_id) notes.push({ user_id: escrow.seller_id, title: "Dispute resolved", body: summary, link: `/orders/${order.id}` });
    await db.from("notifications").insert(notes);

    return { ok: true, releaseKobo, refundKobo };
  });

export const listEscrowTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => ({ search: d?.search ? String(d.search) : "" }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    await db.rpc("escrow_sweep_overdue");
    let q = db
      .from("escrow_transactions")
      .select("*,orders(id,kind,status,stage,total_kobo,created_at,vendors(store_name),artisans(display_name))")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.search) q = q.or(`escrow_ref.ilike.%${data.search}%,order_id.eq.${data.search}`);
    const { data: rows } = await q;
    const list = rows ?? [];
    const userIds = Array.from(new Set(list.flatMap((r: any) => [r.customer_id, r.seller_id].filter(Boolean))));
    const [{ data: profs }, { data: wallets }] = await Promise.all([
      db.from("profiles").select("id,full_name,suspended_at").in("id", userIds),
      db.from("wallets").select("user_id,balance_kobo,escrow_kobo,pending_kobo").in("user_id", userIds),
    ]);
    const pMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
    const wMap = new Map((wallets ?? []).map((w: any) => [w.user_id, w]));
    return list.map((r: any) => ({
      ...r,
      customer: pMap.get(r.customer_id) ?? null,
      seller: r.seller_id ? (pMap.get(r.seller_id) ?? null) : null,
      customer_wallet: wMap.get(r.customer_id) ?? null,
      seller_wallet: r.seller_id ? (wMap.get(r.seller_id) ?? null) : null,
    }));
  });

export const getDisputeReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ disputeId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: dispute } = await db.from("disputes").select("*").eq("id", data.disputeId).maybeSingle();
    if (!dispute) throw new Error("Dispute not found");
    const [{ data: order }, { data: escrow }, { data: logs }] = await Promise.all([
      db.from("orders").select("*,order_items(*),vendors(store_name),artisans(display_name)").eq("id", dispute.order_id).maybeSingle(),
      db.from("escrow_transactions").select("*").eq("order_id", dispute.order_id).maybeSingle(),
      db.from("audit_logs").select("*").eq("entity_id", dispute.order_id).order("created_at", { ascending: true }),
    ]);
    const ids = [order?.customer_id, escrow?.seller_id].filter(Boolean) as string[];
    const { data: profs } = await db.from("profiles").select("id,full_name,phone,city").in("id", ids);
    return { dispute, order, escrow, timeline: logs ?? [], parties: profs ?? [], generated_at: new Date().toISOString() };
  });

export const setUserSuspended = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ userId: z.string().uuid(), suspended: z.boolean(), reason: z.string().max(500).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.userId === context.userId) throw new Error("You cannot suspend yourself");
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    await db
      .from("profiles")
      .update({
        suspended_at: data.suspended ? new Date().toISOString() : null,
        suspension_reason: data.suspended ? (data.reason ?? "Policy violation") : null,
      })
      .eq("id", data.userId);
    await db.from("admin_actions").insert({
      admin_id: context.userId,
      action: data.suspended ? "user.suspended" : "user.reinstated",
      target_type: "user",
      target_id: data.userId,
      notes: data.reason ?? null,
    });
    await db.from("notifications").insert({
      user_id: data.userId,
      title: data.suspended ? "Account suspended" : "Account reinstated",
      body: data.suspended ? (data.reason ?? "Contact support for details.") : "You can trade on PadiPlug again.",
      link: "/dashboard",
    });
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
