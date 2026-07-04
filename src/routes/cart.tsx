import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Cart — PadiPlug" }] }),
  component: () => (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
      <h1 className="mt-4 font-display text-2xl font-bold">Your cart is instant checkout</h1>
      <p className="mt-2 text-muted-foreground">
        For now, use the Buy button on any product — funds go straight into escrow. Multi-item cart coming soon.
      </p>
      <Link to="/marketplace" className="mt-6 inline-flex rounded-full bg-primary px-5 py-2 text-primary-foreground">Continue shopping</Link>
    </div>
  ),
});
