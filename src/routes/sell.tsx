import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Store, Wrench, ShieldCheck, Wallet, TrendingUp, BadgeCheck } from "lucide-react";

export const Route = createFileRoute("/sell")({
  head: () => ({
    meta: [
      { title: "Sell on PadiPlug — Reach African buyers you can trust" },
      { name: "description", content: "Open a store or list your skills. Every sale is escrow-protected. Get paid the moment your customer confirms." },
    ],
  }),
  component: SellPage,
});

function SellPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="text-center">
        <h1 className="font-display text-4xl font-bold md:text-5xl">Grow your business on PadiPlug</h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">Sell products or offer services to a community that values verified African makers. Escrow keeps buyers confident and payouts fast.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="bg-gradient-hero text-primary-foreground shadow-elevated hover:opacity-95">
            <Link to="/vendor">Open a store</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/artisan">List your skills</Link>
          </Button>
        </div>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border bg-card p-8 shadow-card">
          <Store className="h-8 w-8 text-primary" />
          <h2 className="mt-4 font-display text-2xl font-bold">Vendors</h2>
          <p className="mt-2 text-sm text-muted-foreground">Fashion, food, beauty, electronics — anything you can package and ship.</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-primary" /> Verified store badge</li>
            <li className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Featured placements</li>
            <li className="flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> Payouts to your wallet in 1 click</li>
          </ul>
        </div>
        <div className="rounded-3xl border bg-card p-8 shadow-card">
          <Wrench className="h-8 w-8 text-sunset" />
          <h2 className="mt-4 font-display text-2xl font-bold">Artisans</h2>
          <p className="mt-2 text-sm text-muted-foreground">Tailors, braiders, plumbers, carpenters, caterers, event planners and more.</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Escrow keeps clients booking</li>
            <li className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-primary" /> Portfolio + verification badges</li>
            <li className="flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> Get paid the moment they tap Done</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
