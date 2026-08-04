import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const COMMISSION_BPS = 500; // 5%

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function sellerIdForOrder(db: any, order: any): Promise<string | null> {
  if (order.vendor_id) {
    const { data } = await db.from("vendors").select("owner_id").eq("id", order.vendor_id).maybeSingle();
    return data?.owner_id ?? null;
  }
  if (order.artisan_id) {
    const { data } = await db.from("artisans").select("owner_id").eq("id", order.artisan_id).maybeSingle();
    return data?.owner_id ?? null;
  }
  return null;
}

async function assertNotSuspended(db: any, userId: string) {
  const { data } = await db.from("profiles").select("suspended_at").eq("id", userId).maybeSingle();
  if (data?.suspended_at) throw new Error("Your account is suspended. Contact support.");
}

async function log(db: any, actorId: string | null, action: string, entityId: string | null, meta: any = {}) {
  await db.from("audit_logs").insert({ actor_id: actorId, action, entity: "order", entity_id: entityId, meta });
}

export const getMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    await db.rpc("escrow_sweep_overdue");
    const { data } = await context.supabase
      .from("orders")
      .select(
        "id,kind,status,stage,total_kobo,currency,created_at,completed_at,delivery_deadline_at,vendor_id,artisan_id,vendors(store_name,slug),artisans(display_name,slug)",
      )
      .order("created_at", { ascending: false });
    return data ?? [];
  });

export const getOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: order } = await context.supabase
      .from("orders")
      .select("*,vendors(store_name,slug,owner_id),artisans(display_name,slug,owner_id),order_items(*)")
      .eq("id", data.id)
      .maybeSingle();
    if (!order) return null;
    const { data: escrow } = await context.supabase
      .from("escrow_transactions")
      .select("*")
      .eq("order_id", data.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: receipts } = await context.supabase
      .from("receipts")
      .select("*")
      .eq("order_id", data.id)
      .order("created_at", { ascending: true });
    return { ...order, escrow, receipts: receipts ?? [] };
  });

export const buyNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ productId: z.string().uuid(), quantity: z.number().int().positive().max(50) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = await admin();
    await assertNotSuspended(db, userId);

    const { data: product } = await supabase
      .from("products")
      .select("id,title,images,price_kobo,vendor_id,stock")
      .eq("id", data.productId)
      .maybeSingle();
    if (!product) throw new Error("Product not found");
    if (product.stock < data.quantity) throw new Error("Insufficient stock");

    const subtotal = product.price_kobo * data.quantity;
    const commission = Math.floor((subtotal * COMMISSION_BPS) / 10000);

    const sellerId = await sellerIdForOrder(db, { vendor_id: product.vendor_id });

    const { data: order, error: oErr } = await db
      .from("orders")
      .insert({
        customer_id: userId,
        vendor_id: product.vendor_id,
        kind: "product",
        subtotal_kobo: subtotal,
        commission_kobo: commission,
        total_kobo: subtotal,
        status: "pending_payment",
        stage: "pending_payment",
      })
      .select()
      .single();
    if (oErr || !order) throw new Error(oErr?.message ?? "Failed to create order");

    await db.from("order_items").insert({
      order_id: order.id,
      product_id: product.id,
      title_snapshot: product.title,
      image_snapshot: product.images?.[0] ?? null,
      unit_price_kobo: product.price_kobo,
      quantity: data.quantity,
      line_total_kobo: subtotal,
    });

    const { data: held, error: hErr } = await db.rpc("escrow_hold", {
      _order_id: order.id,
      _customer_id: userId,
      _seller_id: sellerId,
      _amount_kobo: subtotal,
      _commission_kobo: commission,
    });
    if (hErr) {
      await db.from("orders").delete().eq("id", order.id);
      if (String(hErr.message).includes("INSUFFICIENT_FUNDS")) {
        throw new Error("Insufficient wallet balance. Please fund your wallet first.");
      }
      throw new Error(hErr.message);
    }

    await db.from("products").update({ stock: product.stock - data.quantity }).eq("id", product.id);
    await db.from("notifications").insert([
      { user_id: userId, title: "Payment successful", body: `Funds are locked in escrow (${(held as any)?.escrow_ref ?? ""}). The seller has been notified.`, link: `/orders/${order.id}` },
      ...(sellerId ? [{ user_id: sellerId, title: "New order — action needed", body: `Accept the order for ${product.title}.`, link: `/orders/${order.id}` }] : []),
    ]);

    return { orderId: order.id, escrow: held };
  });

export const bookService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ serviceId: z.string().uuid(), scheduledAt: z.string().optional(), notes: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = await admin();
    await assertNotSuspended(db, userId);

    const { data: svc } = await supabase
      .from("services")
      .select("id,title,price_from_kobo,artisan_id")
      .eq("id", data.serviceId)
      .maybeSingle();
    if (!svc) throw new Error("Service not found");
    const total = svc.price_from_kobo;
    const commission = Math.floor((total * COMMISSION_BPS) / 10000);
    const sellerId = await sellerIdForOrder(db, { artisan_id: svc.artisan_id });

    const { data: order, error } = await db
      .from("orders")
      .insert({
        customer_id: userId,
        artisan_id: svc.artisan_id,
        service_id: svc.id,
        kind: "service",
        subtotal_kobo: total,
        commission_kobo: commission,
        total_kobo: total,
        status: "pending_payment",
        stage: "pending_payment",
        scheduled_at: data.scheduledAt ?? null,
        notes: data.notes ?? null,
      })
      .select()
      .single();
    if (error || !order) throw new Error(error?.message ?? "Booking failed");

    const { data: held, error: hErr } = await db.rpc("escrow_hold", {
      _order_id: order.id,
      _customer_id: userId,
      _seller_id: sellerId,
      _amount_kobo: total,
      _commission_kobo: commission,
    });
    if (hErr) {
      await db.from("orders").delete().eq("id", order.id);
      if (String(hErr.message).includes("INSUFFICIENT_FUNDS")) {
        throw new Error("Insufficient wallet balance. Please fund your wallet first.");
      }
      throw new Error(hErr.message);
    }

    await db.from("notifications").insert([
      { user_id: userId, title: "Booking paid into escrow", body: "The artisan has been notified to accept your booking.", link: `/orders/${order.id}` },
      ...(sellerId ? [{ user_id: sellerId, title: "New booking — action needed", body: svc.title, link: `/orders/${order.id}` }] : []),
    ]);
    return { orderId: order.id, escrow: held };
  });

export const acceptOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: order } = await db.from("orders").select("*").eq("id", data.orderId).maybeSingle();
    if (!order) throw new Error("Order not found");
    const sellerId = await sellerIdForOrder(db, order);
    if (sellerId !== context.userId) throw new Error("Not authorized");
    if (order.stage !== "awaiting_acceptance") throw new Error("Order already accepted");
    await db.from("orders").update({ stage: "processing", accepted_at: new Date().toISOString() }).eq("id", order.id);
    await db.from("notifications").insert({
      user_id: order.customer_id,
      title: "Seller accepted your order",
      body: "Your order is now being processed.",
      link: `/orders/${order.id}`,
    });
    await log(db, context.userId, "order.accepted", order.id);
    return { ok: true };
  });

export const markFulfilled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: order } = await db.from("orders").select("*").eq("id", data.orderId).maybeSingle();
    if (!order) throw new Error("Order not found");
    const sellerId = await sellerIdForOrder(db, order);
    if (sellerId !== context.userId) throw new Error("Not authorized");
    if (order.status !== "paid_escrow") throw new Error("Cannot mark delivered in current state");
    await db
      .from("orders")
      .update({ status: "fulfilled", stage: "waiting_confirmation", shipped_at: new Date().toISOString() })
      .eq("id", order.id);
    await db.from("notifications").insert({
      user_id: order.customer_id,
      title: order.kind === "product" ? "Order shipped" : "Service completed",
      body: "Tap DONE to release payment, or Report issue if something is wrong.",
      link: `/orders/${order.id}`,
    });
    await log(db, context.userId, "order.shipped", order.id);
    return { ok: true };
  });

export const cancelOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid(), reason: z.string().max(500).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: order } = await db.from("orders").select("*").eq("id", data.orderId).maybeSingle();
    if (!order) throw new Error("Order not found");
    const sellerId = await sellerIdForOrder(db, order);
    if (sellerId !== context.userId) throw new Error("Only the seller can cancel");
    if (!["paid_escrow"].includes(order.status)) throw new Error("Cannot cancel in current state");

    const { error } = await db.rpc("escrow_settle", {
      _order_id: order.id,
      _release_kobo: 0,
      _refund_kobo: order.total_kobo,
      _actor_id: context.userId,
      _reason: data.reason ?? "Seller cancelled the order",
    });
    if (error) throw new Error(error.message);
    await db.from("orders").update({ status: "cancelled", stage: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", order.id);
    await db.from("notifications").insert({
      user_id: order.customer_id,
      title: "Order cancelled — refunded",
      body: "The seller cancelled. Your escrow has been refunded to your wallet.",
      link: `/orders/${order.id}`,
    });
    return { ok: true };
  });

export const confirmDone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: order } = await db.from("orders").select("*").eq("id", data.orderId).maybeSingle();
    if (!order) throw new Error("Order not found");
    if (order.customer_id !== context.userId) throw new Error("Only the customer can confirm");
    if (!["paid_escrow", "fulfilled"].includes(order.status)) throw new Error("Cannot confirm in current state");

    const { data: result, error } = await db.rpc("escrow_settle", {
      _order_id: order.id,
      _release_kobo: order.total_kobo,
      _refund_kobo: 0,
      _actor_id: context.userId,
      _reason: "Customer confirmed delivery",
    });
    if (error) throw new Error(error.message);

    const sellerId = await sellerIdForOrder(db, order);
    await db.from("notifications").insert([
      { user_id: order.customer_id, title: "Escrow released", body: "Payment sent to the seller. Please leave a review.", link: `/orders/${order.id}` },
      ...(sellerId ? [{ user_id: sellerId, title: "Payment received", body: "Escrow released to your wallet. It is now available for withdrawal.", link: `/wallet` }] : []),
    ]);
    return { ok: true, result };
  });

export const openDispute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ orderId: z.string().uuid(), reason: z.string().min(10).max(2000), evidenceUrls: z.array(z.string().url()).max(10).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: order } = await db.from("orders").select("*").eq("id", data.orderId).maybeSingle();
    if (!order) throw new Error("Order not found");
    if (order.customer_id !== context.userId) throw new Error("Only the customer can open a dispute");
    if (!["paid_escrow", "fulfilled"].includes(order.status)) throw new Error("Cannot dispute in current state");

    await db.from("orders").update({ status: "disputed", stage: "dispute_open" }).eq("id", order.id);
    const { error } = await db.from("disputes").insert({
      order_id: order.id,
      opened_by: context.userId,
      reason: data.reason,
      evidence_urls: data.evidenceUrls ?? [],
    });
    if (error) throw new Error(error.message);

    const sellerId = await sellerIdForOrder(db, order);
    const { data: admins } = await db.from("user_roles").select("user_id").in("role", ["admin", "super_admin"]);
    await db.from("notifications").insert([
      { user_id: context.userId, title: "Dispute opened", body: "Escrow stays locked until our team decides.", link: `/orders/${order.id}` },
      ...(sellerId ? [{ user_id: sellerId, title: "Dispute opened on your order", body: "Add your response — escrow is frozen.", link: `/orders/${order.id}` }] : []),
      ...Array.from(new Set((admins ?? []).map((a: any) => a.user_id))).map((uid) => ({
        user_id: uid as string,
        title: "New dispute filed",
        body: "Review evidence and decide in the disputes console.",
        link: "/admin/disputes",
      })),
    ]);
    await log(db, context.userId, "dispute.opened", order.id, { reason: data.reason });
    return { ok: true };
  });

export const addDisputeEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid(), url: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: dispute } = await db.from("disputes").select("id,opened_by,evidence_urls,order_id").eq("order_id", data.orderId).maybeSingle();
    if (!dispute) throw new Error("Dispute not found");
    const { data: order } = await db.from("orders").select("*").eq("id", dispute.order_id).maybeSingle();
    const sellerId = await sellerIdForOrder(db, order);
    if (dispute.opened_by !== context.userId && sellerId !== context.userId) throw new Error("Not authorized");
    const urls = [...(dispute.evidence_urls ?? []), data.url];
    const { error } = await db.from("disputes").update({ evidence_urls: urls }).eq("id", dispute.id);
    if (error) throw new Error(error.message);
    return { ok: true, urls };
  });

export const respondToDispute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid(), response: z.string().min(5).max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: dispute } = await db.from("disputes").select("id,order_id").eq("order_id", data.orderId).maybeSingle();
    if (!dispute) throw new Error("Dispute not found");
    const { data: order } = await db.from("orders").select("*").eq("id", dispute.order_id).maybeSingle();
    const sellerId = await sellerIdForOrder(db, order);
    if (sellerId !== context.userId) throw new Error("Only the seller can respond");
    await db.from("disputes").update({ seller_response: data.response }).eq("id", dispute.id);
    await db.from("notifications").insert({
      user_id: order.customer_id,
      title: "Seller responded to your dispute",
      body: "Our team is reviewing both sides.",
      link: `/orders/${order.id}`,
    });
    return { ok: true };
  });

export const getMyDispute = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: dispute } = await context.supabase.from("disputes").select("*").eq("order_id", data.orderId).maybeSingle();
    return dispute;
  });

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid(), rating: z.number().int().min(1).max(5), comment: z.string().max(1000).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order } = await supabase.from("orders").select("vendor_id,artisan_id,customer_id").eq("id", data.orderId).maybeSingle();
    if (!order || order.customer_id !== userId) throw new Error("Not allowed");
    await supabase.from("reviews").insert({
      customer_id: userId,
      order_id: data.orderId,
      vendor_id: order.vendor_id,
      artisan_id: order.artisan_id,
      rating: data.rating,
      comment: data.comment ?? null,
    });
    return { ok: true };
  });
