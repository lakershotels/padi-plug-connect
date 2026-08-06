import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const COMMISSION_BPS = 500; // 5%

const SHIPPING_FEES: Record<string, number> = {
  pickup: 0,
  standard: 150000,
  express: 350000,
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

const checkoutSchema = z.object({
  items: z
    .array(z.object({ productId: z.string().uuid(), quantity: z.number().int().positive().max(50) }))
    .min(1)
    .max(30),
  address: z.object({
    full_name: z.string().min(2).max(120),
    phone: z.string().min(6).max(30),
    line1: z.string().min(3).max(200),
    city: z.string().min(2).max(80),
    state: z.string().min(2).max(80),
    notes: z.string().max(300).optional().nullable(),
  }),
  shippingMethod: z.enum(["pickup", "standard", "express"]),
  /** Must be true — nothing is charged without an explicit customer confirmation. */
  confirm: z.literal(true),
});

/**
 * Reviews the cart server-side and, only after the customer's explicit confirmation,
 * creates one order per seller and locks the funds in escrow.
 */
export const checkoutCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => checkoutSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const db = await admin();

    const { data: profile } = await db.from("profiles").select("suspended_at").eq("id", userId).maybeSingle();
    if (profile?.suspended_at) throw new Error("Your account is suspended. Contact support.");

    const ids = data.items.map((i) => i.productId);
    const { data: products } = await db
      .from("products")
      .select("id,title,images,price_kobo,stock,vendor_id,is_active")
      .in("id", ids);
    const byId = new Map<string, any>((products ?? []).map((p: any) => [p.id, p]));

    for (const line of data.items) {
      const p = byId.get(line.productId);
      if (!p || !p.is_active) throw new Error("A product in your cart is no longer available");
      if (p.stock < line.quantity) throw new Error(`Only ${p.stock} left of "${p.title}"`);
    }

    // group by seller so each store gets its own escrow-protected order
    const groups = new Map<string, { productId: string; quantity: number }[]>();
    for (const line of data.items) {
      const vendorId = byId.get(line.productId).vendor_id as string;
      groups.set(vendorId, [...(groups.get(vendorId) ?? []), line]);
    }

    const shippingFee = SHIPPING_FEES[data.shippingMethod] ?? 0;

    // affordability check across the whole cart before touching any escrow
    const { data: wallet } = await db.from("wallets").select("balance_kobo").eq("user_id", userId).maybeSingle();
    const grandTotal =
      data.items.reduce((s, l) => s + byId.get(l.productId).price_kobo * l.quantity, 0) + shippingFee * groups.size;
    if (!wallet || wallet.balance_kobo < grandTotal) {
      throw new Error("Insufficient wallet balance. Please fund your wallet first.");
    }

    const orderIds: string[] = [];

    for (const [vendorId, lines] of groups) {
      const { data: vendor } = await db.from("vendors").select("owner_id,store_name").eq("id", vendorId).maybeSingle();
      const sellerId = vendor?.owner_id ?? null;
      const subtotal = lines.reduce((s, l) => s + byId.get(l.productId).price_kobo * l.quantity, 0);
      const total = subtotal + shippingFee;
      const commission = Math.floor((subtotal * COMMISSION_BPS) / 10000);

      const { data: order, error: oErr } = await db
        .from("orders")
        .insert({
          customer_id: userId,
          vendor_id: vendorId,
          kind: "product",
          subtotal_kobo: subtotal,
          commission_kobo: commission,
          total_kobo: total,
          status: "pending_payment",
          stage: "pending_payment",
          shipping_address: { ...data.address, shipping_method: data.shippingMethod, shipping_fee_kobo: shippingFee },
        })
        .select()
        .single();
      if (oErr || !order) throw new Error(oErr?.message ?? "Failed to create order");

      await db.from("order_items").insert(
        lines.map((l) => {
          const p = byId.get(l.productId);
          return {
            order_id: order.id,
            product_id: p.id,
            title_snapshot: p.title,
            image_snapshot: p.images?.[0] ?? null,
            unit_price_kobo: p.price_kobo,
            quantity: l.quantity,
            line_total_kobo: p.price_kobo * l.quantity,
          };
        }),
      );

      const { error: hErr } = await db.rpc("escrow_hold", {
        _order_id: order.id,
        _customer_id: userId,
        _seller_id: sellerId,
        _amount_kobo: total,
        _commission_kobo: commission,
      });
      if (hErr) {
        await db.from("order_items").delete().eq("order_id", order.id);
        await db.from("orders").delete().eq("id", order.id);
        if (String(hErr.message).includes("INSUFFICIENT_FUNDS")) {
          throw new Error("Insufficient wallet balance. Please fund your wallet first.");
        }
        throw new Error(hErr.message);
      }

      for (const l of lines) {
        const p = byId.get(l.productId);
        await db.from("products").update({ stock: Math.max(0, p.stock - l.quantity) }).eq("id", p.id);
      }

      await db.from("notifications").insert([
        {
          user_id: userId,
          title: "Payment held in escrow",
          body: `Your order with ${vendor?.store_name ?? "the seller"} is paid into escrow.`,
          link: `/orders/${order.id}`,
        },
        ...(sellerId
          ? [{ user_id: sellerId, title: "New order — action needed", body: "Accept the order to start fulfilment.", link: `/orders/${order.id}` }]
          : []),
      ]);

      orderIds.push(order.id);
    }

    return { orderIds };
  });
