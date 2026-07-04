import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getMyOrders } from "@/lib/orders.functions";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";

const STATUS_STYLE: Record<string, string> = {
  paid_escrow: "bg-gold/25 text-gold-foreground",
  fulfilled: "bg-primary/15 text-primary",
  released: "bg-success/15 text-success",
  completed: "bg-success/15 text-success",
  disputed: "bg-destructive/15 text-destructive",
  pending_payment: "bg-muted text-muted-foreground",
};

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "My orders — PadiPlug" }] }),
  component: OrdersPage,
});

function OrdersPage() {
  const { data, isPending } = useQuery({ queryKey: ["orders"], queryFn: () => getMyOrders() });
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold">My orders</h1>
      <p className="text-sm text-muted-foreground">Track escrow status and confirm delivery.</p>

      {isPending ? (
        <div className="py-24 text-center text-muted-foreground">Loading…</div>
      ) : !data || data.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          No orders yet. <Link to="/marketplace" className="text-primary hover:underline">Start shopping →</Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {data.map((o: any) => (
            <li key={o.id}>
              <Link to="/orders/$id" params={{ id: o.id }} className="flex items-center justify-between rounded-2xl border bg-card p-5 shadow-card transition-colors hover:bg-secondary/40">
                <div>
                  <div className="font-medium">{o.kind === "product" ? o.vendors?.store_name : o.artisans?.display_name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge className={`${STATUS_STYLE[o.status] ?? "bg-muted"} capitalize`}>{o.status.replace(/_/g, " ")}</Badge>
                  <div className="font-display text-lg font-semibold">{formatMoney(o.total_kobo)}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
