import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShoppingBag, Trash2, ShieldCheck, Truck, MapPin, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/money";
import { useSession } from "@/hooks/use-session";
import { checkoutCart } from "@/lib/cart.functions";
import { useCart, setQuantity, removeFromCart, clearCart, SHIPPING_METHODS, type ShippingMethodId } from "@/lib/cart-store";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart & escrow checkout — PadiPlug" },
      { name: "description", content: "Review your items, add a delivery address, pick a shipping method and pay into escrow. Sellers are paid only after you confirm delivery." },
      { property: "og:title", content: "Your cart & escrow checkout — PadiPlug" },
      { property: "og:description", content: "Escrow-protected checkout on PadiPlug." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CartPage,
});

type Step = 1 | 2 | 3 | 4;
const STEPS = ["Review order", "Delivery address", "Shipping method", "Payment"];

function CartPage() {
  const { items, subtotalKobo } = useCart();
  const { user } = useSession();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [method, setMethod] = useState<ShippingMethodId>("standard");
  const [confirmed, setConfirmed] = useState(false);
  const [address, setAddress] = useState({ full_name: "", phone: "", line1: "", city: "", state: "", notes: "" });

  const checkout = useServerFn(checkoutCart);
  const sellerCount = new Set(items.map((i) => i.vendorId)).size;
  const shippingFee = (SHIPPING_METHODS.find((m) => m.id === method)?.feeKobo ?? 0) * sellerCount;
  const total = subtotalKobo + shippingFee;

  const pay = useMutation({
    mutationFn: () =>
      checkout({
        data: {
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          address: { ...address, notes: address.notes || null },
          shippingMethod: method,
          confirm: true as const,
        },
      }),
    onSuccess: (r: any) => {
      clearCart();
      toast.success("Paid into escrow. The seller has been notified.");
      const first = r.orderIds?.[0];
      navigate(first ? { to: "/orders/$id", params: { id: first } } : { to: "/orders" });
    },
    onError: (e: any) => {
      const msg = e?.message ?? "Checkout failed";
      if (/insufficient wallet/i.test(msg)) {
        toast.error("Insufficient wallet balance. Redirecting to fund your wallet…");
        setTimeout(() => navigate({ to: "/wallet" }), 800);
      } else toast.error(msg);
    },
  });

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-4 font-display text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Browse the marketplace and add items to your cart — every payment is escrow protected.</p>
        <Link to="/marketplace" className="mt-6 inline-flex rounded-full bg-primary px-5 py-2 text-primary-foreground">Start shopping</Link>
      </div>
    );
  }

  const addressValid =
    address.full_name.trim().length > 1 &&
    address.phone.trim().length > 5 &&
    address.line1.trim().length > 2 &&
    address.city.trim().length > 1 &&
    address.state.trim().length > 1;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold">Checkout</h1>

      <ol className="mt-4 flex flex-wrap gap-2 text-xs">
        {STEPS.map((label, idx) => (
          <li
            key={label}
            className={`rounded-full border px-3 py-1 ${step === idx + 1 ? "border-primary bg-primary text-primary-foreground" : step > idx + 1 ? "border-primary/40 text-primary" : "text-muted-foreground"}`}
          >
            {idx + 1}. {label}
          </li>
        ))}
      </ol>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {step === 1 && (
            <Card className="divide-y overflow-hidden">
              {items.map((i) => (
                <div key={i.productId} className="flex items-center gap-3 p-3">
                  {i.image ? (
                    <img src={i.image} alt={i.title} className="h-16 w-16 rounded-lg border object-cover" />
                  ) : (
                    <div className="grid h-16 w-16 place-items-center rounded-lg border text-xs text-muted-foreground">No image</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <Link to="/products/$id" params={{ id: i.productId }} className="line-clamp-1 text-sm font-medium hover:underline">{i.title}</Link>
                    <div className="text-xs text-muted-foreground">{i.vendorName}</div>
                    <div className="mt-1 font-display text-sm font-semibold text-primary">{formatMoney(i.priceKobo)}</div>
                  </div>
                  <div className="inline-flex items-center rounded-lg border">
                    <button className="px-2.5 py-1.5" aria-label="Decrease" onClick={() => setQuantity(i.productId, i.quantity - 1)}>−</button>
                    <span className="w-8 text-center text-sm">{i.quantity}</span>
                    <button className="px-2.5 py-1.5" aria-label="Increase" onClick={() => setQuantity(i.productId, i.quantity + 1)}>+</button>
                  </div>
                  <Button size="icon" variant="ghost" aria-label="Remove item" onClick={() => removeFromCart(i.productId)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </Card>
          )}

          {step === 2 && (
            <Card className="space-y-3 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4 text-primary" /> Delivery address</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input placeholder="Full name" value={address.full_name} onChange={(e) => setAddress({ ...address, full_name: e.target.value })} />
                <Input placeholder="Phone number" value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} />
                <Input className="sm:col-span-2" placeholder="Street address" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
                <Input placeholder="City" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                <Input placeholder="State" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} />
              </div>
              <Textarea placeholder="Delivery notes (optional)" value={address.notes} onChange={(e) => setAddress({ ...address, notes: e.target.value })} />
            </Card>
          )}

          {step === 3 && (
            <Card className="space-y-2 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold"><Truck className="h-4 w-4 text-primary" /> Shipping method</div>
              {SHIPPING_METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={`flex w-full items-center justify-between rounded-xl border p-3 text-left ${method === m.id ? "border-primary bg-secondary/50" : ""}`}
                >
                  <span>
                    <span className="block text-sm font-medium">{m.label}</span>
                    <span className="block text-xs text-muted-foreground">{m.note}</span>
                  </span>
                  <span className="text-sm font-semibold">{m.feeKobo === 0 ? "Free" : formatMoney(m.feeKobo)}</span>
                </button>
              ))}
              {sellerCount > 1 && (
                <p className="text-xs text-muted-foreground">Your cart has items from {sellerCount} sellers — shipping is charged per seller.</p>
              )}
            </Card>
          )}

          {step === 4 && (
            <Card className="space-y-3 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-primary" /> Pay with wallet into escrow</div>
              <p className="text-sm text-muted-foreground">
                {formatMoney(total)} will be locked in escrow. The seller ships, you receive the goods, and payment is released only when you tap
                “DONE — I received it”.
              </p>
              <div className="rounded-xl border bg-secondary/40 p-3 text-xs text-muted-foreground">
                Delivering to {address.full_name}, {address.line1}, {address.city}, {address.state} · {SHIPPING_METHODS.find((m) => m.id === method)?.label}
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                <span>I confirm this order and authorise PadiPlug to hold {formatMoney(total)} from my wallet in escrow.</span>
              </label>
              <Button
                size="lg"
                className="w-full bg-gradient-hero text-primary-foreground"
                disabled={!confirmed || pay.isPending}
                onClick={() => {
                  if (!user) { navigate({ to: "/auth" }); return; }
                  pay.mutate();
                }}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {pay.isPending ? "Holding funds…" : `Confirm & pay ${formatMoney(total)}`}
              </Button>
            </Card>
          )}

          <div className="flex justify-between">
            <Button variant="ghost" disabled={step === 1} onClick={() => setStep((s) => (s - 1) as Step)}>Back</Button>
            {step < 4 && (
              <Button
                disabled={step === 2 && !addressValid}
                onClick={() => setStep((s) => (s + 1) as Step)}
              >
                Continue
              </Button>
            )}
          </div>
        </div>

        <Card className="h-fit space-y-2 p-4 text-sm">
          <div className="font-semibold">Order summary</div>
          <div className="flex justify-between text-muted-foreground"><span>Items</span><span>{formatMoney(subtotalKobo)}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>Shipping</span><span>{shippingFee === 0 ? "Free" : formatMoney(shippingFee)}</span></div>
          <div className="flex justify-between border-t pt-2 font-display text-base font-bold"><span>Total</span><span className="text-primary">{formatMoney(total)}</span></div>
          <p className="pt-2 text-xs text-muted-foreground">Nothing is charged until you confirm on the payment step.</p>
        </Card>
      </div>
    </div>
  );
}
