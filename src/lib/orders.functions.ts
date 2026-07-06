import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const COMMISSION_BPS = 500; // 5%

export const getMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("orders")
      .select("id,kind,status,total_kobo,currency,created_at,completed_at,vendor_id,artisan_id,vendors(store_name,slug),artisans(display_name,slug)")
      .order("created_at", { ascending: false });
    return data ?? [];
  });

export const getOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: order } = await context.supabase
      .from("orders")
      .select("*,vendors(store_name,slug),artisans(display_name,slug),order_items(*)")
      .eq("id", data.id)
      .maybeSingle();
    return order;
  });

export const buyNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ productId: z.string().uuid(), quantity: z.number().int().positive().max(50) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: product, error: pErr } = await supabase
      .from("products")
      .select("id,title,images,price_kobo,vendor_id,stock")
      .eq("id", data.productId)
      .maybeSingle();
    if (pErr || !product) throw new Error("Product not found");
    if (product.stock < data.quantity) throw new Error("Insufficient stock");

    const subtotal = product.price_kobo * data.quantity;
    const commission = Math.floor((subtotal * COMMISSION_BPS) / 10000);
    const total = subtotal;

    // Check wallet balance
    const { data: wallet } = await supabase.from("wallets").select("balance_kobo,currency").eq("user_id", userId).maybeSingle();
    if (!wallet || wallet.balance_kobo < total) {
      throw new Error("Insufficient wallet balance. Please fund your wallet first.");
    }

    // Create order
    const { data: order, error: oErr } = await supabase
      .from("orders")
      .insert({
        customer_id: userId,
        vendor_id: product.vendor_id,
        kind: "product",
        subtotal_kobo: subtotal,
        commission_kobo: commission,
        total_kobo: total,
        status: "paid_escrow",
      })
      .select()
      .single();
    if (oErr || !order) throw new Error(oErr?.message ?? "Failed to create order");

    await supabase.from("order_items").insert({
      order_id: order.id,
      product_id: product.id,
      title_snapshot: product.title,
      image_snapshot: product.images?.[0] ?? null,
      unit_price_kobo: product.price_kobo,
      quantity: data.quantity,
      line_total_kobo: subtotal,
    });

    // Move funds: balance → escrow
    await supabase.rpc; // no-op guard
    const newBalance = wallet.balance_kobo - total;
    await supabase.from("wallets").update({ balance_kobo: newBalance, escrow_kobo: (wallet as any).escrow_kobo ? undefined : undefined }).eq("user_id", userId);
    // We need to increment escrow — do it via a raw fetch since rpc not defined; simplest: read then update
    const { data: w2 } = await supabase.from("wallets").select("escrow_kobo").eq("user_id", userId).single();
    await supabase.from("wallets").update({ escrow_kobo: (w2?.escrow_kobo ?? 0) + total }).eq("user_id", userId);

    await supabase.from("wallet_transactions").insert({
      user_id: userId,
      type: "hold",
      amount_kobo: -total,
      balance_after_kobo: newBalance,
      description: `Escrow hold for order`,
      order_id: order.id,
    });

    await supabase.from("notifications").insert({
      user_id: userId,
      title: "Order placed",
      body: `Your order is now in escrow. Funds release when you confirm delivery.`,
      link: `/orders/${order.id}`,
    });

    // Notify vendor owner
    const { data: vendor } = await supabase.from("vendors").select("owner_id,store_name").eq("id", product.vendor_id).maybeSingle();
    if (vendor) {
      await supabase.from("notifications").insert({
        user_id: vendor.owner_id,
        title: "New order",
        body: `You received a new order for ${product.title}.`,
        link: `/orders/${order.id}`,
      });
    }

    // Decrement stock
    await supabase.from("products").update({ stock: product.stock - data.quantity }).eq("id", product.id);

    return { orderId: order.id };
  });

export const bookService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ serviceId: z.string().uuid(), scheduledAt: z.string().optional(), notes: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: svc } = await supabase.from("services").select("id,title,price_from_kobo,artisan_id,images").eq("id", data.serviceId).maybeSingle();
    if (!svc) throw new Error("Service not found");
    const total = svc.price_from_kobo;
    const commission = Math.floor((total * COMMISSION_BPS) / 10000);
    const { data: wallet } = await supabase.from("wallets").select("balance_kobo,escrow_kobo").eq("user_id", userId).maybeSingle();
    if (!wallet || wallet.balance_kobo < total) throw new Error("Insufficient wallet balance.");

    const { data: artisan } = await supabase.from("artisans").select("owner_id").eq("id", svc.artisan_id).maybeSingle();

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        customer_id: userId,
        artisan_id: svc.artisan_id,
        service_id: svc.id,
        kind: "service",
        subtotal_kobo: total,
        commission_kobo: commission,
        total_kobo: total,
        status: "paid_escrow",
        scheduled_at: data.scheduledAt ?? null,
        notes: data.notes ?? null,
      })
      .select()
      .single();
    if (error || !order) throw new Error(error?.message ?? "Booking failed");

    await supabase.from("wallets").update({
      balance_kobo: wallet.balance_kobo - total,
      escrow_kobo: (wallet.escrow_kobo ?? 0) + total,
    }).eq("user_id", userId);
    await supabase.from("wallet_transactions").insert({
      user_id: userId, type: "hold", amount_kobo: -total, balance_after_kobo: wallet.balance_kobo - total,
      description: `Escrow hold for booking`, order_id: order.id,
    });
    await supabase.from("notifications").insert({
      user_id: userId, title: "Booking confirmed", body: "Your booking is in escrow.", link: `/orders/${order.id}`,
    });
    if (artisan) {
      await supabase.from("notifications").insert({
        user_id: artisan.owner_id, title: "New booking", body: svc.title, link: `/orders/${order.id}`,
      });
    }
    return { orderId: order.id };
  });

export const markFulfilled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order } = await context.supabase
      .from("orders").select("*,vendors(owner_id),artisans(owner_id)").eq("id", data.orderId).maybeSingle();
    if (!order) throw new Error("Order not found");
    const isProvider = (order as any).vendors?.owner_id === userId || (order as any).artisans?.owner_id === userId;
    if (!isProvider) throw new Error("Not authorized");
    if (order.status !== "paid_escrow") throw new Error("Cannot mark fulfilled in current state");
    await supabase.from("orders").update({ status: "fulfilled" }).eq("id", order.id);
    await supabase.from("notifications").insert({
      user_id: order.customer_id,
      title: order.kind === "product" ? "Order shipped" : "Service marked complete",
      body: "Please confirm to release payment from escrow.",
      link: `/orders/${order.id}`,
    });
    return { ok: true };
  });

export const confirmDone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order } = await supabase.from("orders").select("*").eq("id", data.orderId).maybeSingle();
    if (!order) throw new Error("Order not found");
    if (order.customer_id !== userId) throw new Error("Only the customer can confirm");
    if (!["paid_escrow", "fulfilled"].includes(order.status)) throw new Error("Cannot confirm in current state");

    // Determine provider
    let providerUserId: string | null = null;
    if (order.vendor_id) {
      const { data: v } = await supabase.from("vendors").select("owner_id").eq("id", order.vendor_id).maybeSingle();
      providerUserId = v?.owner_id ?? null;
    } else if (order.artisan_id) {
      const { data: a } = await supabase.from("artisans").select("owner_id").eq("id", order.artisan_id).maybeSingle();
      providerUserId = a?.owner_id ?? null;
    }
    if (!providerUserId) throw new Error("Provider not found");

    const releaseAmount = order.total_kobo - order.commission_kobo;

    // Debit customer escrow
    const { data: cw } = await supabase.from("wallets").select("escrow_kobo").eq("user_id", userId).maybeSingle();
    await supabase.from("wallets").update({ escrow_kobo: Math.max(0, (cw?.escrow_kobo ?? 0) - order.total_kobo) }).eq("user_id", userId);

    // Ensure provider wallet exists
    await supabase.from("wallets").upsert({ user_id: providerUserId }, { onConflict: "user_id" });
    const { data: pw } = await supabase.from("wallets").select("balance_kobo").eq("user_id", providerUserId).maybeSingle();
    const newProviderBalance = (pw?.balance_kobo ?? 0) + releaseAmount;
    await supabase.from("wallets").update({ balance_kobo: newProviderBalance }).eq("user_id", providerUserId);

    await supabase.from("wallet_transactions").insert([
      { user_id: userId, type: "release", amount_kobo: -order.total_kobo, description: "Escrow released on confirmation", order_id: order.id },
      { user_id: providerUserId, type: "release", amount_kobo: releaseAmount, balance_after_kobo: newProviderBalance, description: "Payout from customer confirmation", order_id: order.id },
      { user_id: providerUserId, type: "commission", amount_kobo: -order.commission_kobo, description: "PadiPlug commission", order_id: order.id },
    ]);

    await supabase.from("orders").update({ status: "released", completed_at: new Date().toISOString() }).eq("id", order.id);

    await supabase.from("notifications").insert([
      { user_id: userId, title: "Payment released", body: "Thanks for confirming. Please leave a review.", link: `/orders/${order.id}` },
      { user_id: providerUserId, title: "Payment received", body: "Escrow released to your wallet.", link: `/orders/${order.id}` },
    ]);
    return { ok: true };
  });

export const openDispute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid(), reason: z.string().min(10).max(1000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order } = await supabase.from("orders").select("*").eq("id", data.orderId).maybeSingle();
    if (!order) throw new Error("Order not found");
    if (order.customer_id !== userId) throw new Error("Only the customer can open a dispute");
    if (!["paid_escrow", "fulfilled"].includes(order.status)) throw new Error("Cannot dispute in current state");
    await supabase.from("orders").update({ status: "disputed" }).eq("id", order.id);
    await supabase.from("disputes").insert({ order_id: order.id, opened_by: userId, reason: data.reason });
    await supabase.from("notifications").insert({
      user_id: userId, title: "Dispute opened", body: "Funds are frozen. Our team will investigate.", link: `/orders/${order.id}`,
    });
    return { ok: true };
  });

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid(), rating: z.number().int().min(1).max(5), comment: z.string().max(1000).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order } = await supabase.from("orders").select("vendor_id,artisan_id,customer_id").eq("id", data.orderId).maybeSingle();
    if (!order || order.customer_id !== userId) throw new Error("Not allowed");
    await supabase.from("reviews").insert({
      customer_id: userId, order_id: data.orderId, vendor_id: order.vendor_id, artisan_id: order.artisan_id,
      rating: data.rating, comment: data.comment ?? null,
    });
    return { ok: true };
  });

export const addDisputeEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid(), url: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: dispute } = await supabase
      .from("disputes")
      .select("id,opened_by,evidence_urls")
      .eq("order_id", data.orderId)
      .maybeSingle();
    if (!dispute) throw new Error("Dispute not found");
    if (dispute.opened_by !== userId) throw new Error("Only the opener can add evidence");
    const urls = [...(dispute.evidence_urls ?? []), data.url];
    const { error } = await supabase.from("disputes").update({ evidence_urls: urls }).eq("id", dispute.id);
    if (error) throw new Error(error.message);
    return { ok: true, urls };
  });

export const getMyDispute = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: dispute } = await context.supabase
      .from("disputes")
      .select("*")
      .eq("order_id", data.orderId)
      .maybeSingle();
    return dispute;
  });
