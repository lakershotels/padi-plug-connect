import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getWallet } from "@/lib/wallet.functions";
import { getMyOrders } from "@/lib/orders.functions";
import { formatMoney } from "@/lib/money";
import { Card } from "@/components/ui/card";
import { ArrowRight, Wallet as WalletIcon, ShoppingBag, Store, Wrench, Heart, Bell } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — PadiPlug" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: wallet } = useQuery({ queryKey: ["wallet"], queryFn: () => getWallet() });
  const { data: orders } = useQuery({ queryKey: ["orders"], queryFn: () => getMyOrders() });

  const openOrders = (orders ?? []).filter((o: any) => ["paid_escrow", "fulfilled", "disputed"].includes(o.status));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold">Welcome back</h1>
      <p className="text-sm text-muted-foreground">Here's what's happening in your PadiPlug account.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Stat label="Wallet balance" value={formatMoney(wallet?.wallet?.balance_kobo)} accent="bg-gradient-hero text-primary-foreground" href="/wallet" icon={WalletIcon} />
        <Stat label="In escrow" value={formatMoney(wallet?.wallet?.escrow_kobo)} accent="bg-gradient-warm text-white" icon={WalletIcon} />
        <Stat label="Open orders" value={String(openOrders.length)} accent="bg-card border" href="/orders" icon={ShoppingBag} />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <QuickLink to="/orders" icon={ShoppingBag} title="My orders" body="Track escrow, confirm delivery, or open a dispute." />
        <QuickLink to="/vendor" icon={Store} title="Vendor console" body="Manage your store and products." />
        <QuickLink to="/artisan" icon={Wrench} title="Artisan console" body="Update your profile and services." />
        <QuickLink to="/favorites" icon={Heart} title="Favorites" body="Products and sellers you saved." />
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Recent activity</h2>
          <Link to="/notifications" className="text-sm text-primary hover:underline"><Bell className="mr-1 inline h-3.5 w-3.5" />Notifications</Link>
        </div>
        {(!orders || orders.length === 0) ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No orders yet. <Link to="/marketplace" className="text-primary hover:underline">Start shopping →</Link>
          </Card>
        ) : (
          <ul className="space-y-2">
            {orders.slice(0, 5).map((o: any) => (
              <li key={o.id}>
                <Link to="/orders/$id" params={{ id: o.id }} className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-card transition-colors hover:bg-secondary/40">
                  <div>
                    <div className="text-sm font-medium">{o.kind === "product" ? o.vendors?.store_name : o.artisans?.display_name}</div>
                    <div className="text-xs text-muted-foreground">{o.status.replace(/_/g, " ")} · {new Date(o.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display font-semibold">{formatMoney(o.total_kobo)}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent, href, icon: Icon }: any) {
  const content = (
    <div className={`rounded-2xl p-5 shadow-card ${accent}`}>
      <div className="flex items-center gap-2 text-xs opacity-80"><Icon className="h-4 w-4" /> {label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
    </div>
  );
  return href ? <Link to={href}>{content}</Link> : content;
}

function QuickLink({ to, icon: Icon, title, body }: any) {
  return (
    <Link to={to} className="group flex flex-col rounded-2xl border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated">
      <Icon className="h-6 w-6 text-primary" />
      <div className="mt-3 font-display font-semibold">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{body}</div>
    </Link>
  );
}
