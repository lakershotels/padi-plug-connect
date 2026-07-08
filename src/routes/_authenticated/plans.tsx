import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { PLANS, purchasePlan, myPurchases } from "@/lib/plans.functions";
import { getMyVendor } from "@/lib/vendor.functions";
import { getMyArtisan } from "@/lib/artisan.functions";
import { getWalletBalance } from "@/lib/wallet.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "@/lib/money";
import { Sparkles, Crown, Rocket, Wallet, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/plans")({
  head: () => ({
    meta: [
      { title: "Plans & Featured Ads — PadiPlug" },
      { name: "description", content: "Register your storefront, boost visibility, or run a featured ad on PadiPlug." },
    ],
  }),
  component: PlansPage,
});

const ICONS = { basic: Sparkles, premium: Crown, featured_ad: Rocket } as const;

function PlansPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [scope, setScope] = useState<"vendor" | "artisan" | "product">("vendor");
  const [productId, setProductId] = useState<string>("");

  const { data: vendor } = useQuery({ queryKey: ["myVendor"], queryFn: () => getMyVendor() });
  const { data: artisan } = useQuery({ queryKey: ["myArtisan"], queryFn: () => getMyArtisan() });
  const { data: wallet } = useQuery({ queryKey: ["walletBalance"], queryFn: () => getWalletBalance() });
  const { data: history = [] } = useQuery({ queryKey: ["myPurchases"], queryFn: () => myPurchases() });

  const buy = useServerFn(purchasePlan);
  const mut = useMutation({
    mutationFn: (v: { planCode: "basic" | "premium" | "featured_ad"; targetId: string }) =>
      buy({ data: { planCode: v.planCode, scope, targetId: v.targetId } as any }),
    onSuccess: () => {
      toast.success("Plan activated 🎉");
      qc.invalidateQueries();
    },
    onError: (e: any) => {
      if (String(e.message).startsWith("INSUFFICIENT_WALLET")) {
        toast.error("Not enough wallet balance — top up first");
        navigate({ to: "/wallet" });
      } else toast.error(e.message);
    },
  });

  const products: any[] = (vendor as any)?.products ?? [];
  const targetId =
    scope === "vendor" ? (vendor as any)?.vendor?.id
    : scope === "artisan" ? (artisan as any)?.artisan?.id
    : productId;

  const currentPlan =
    scope === "vendor" ? (vendor as any)?.vendor?.plan
    : scope === "artisan" ? (artisan as any)?.artisan?.plan
    : undefined;
  const currentExpiry =
    scope === "vendor" ? (vendor as any)?.vendor?.plan_expires_at
    : scope === "artisan" ? (artisan as any)?.artisan?.plan_expires_at
    : undefined;
  const featuredUntil =
    scope === "vendor" ? (vendor as any)?.vendor?.featured_until
    : scope === "artisan" ? (artisan as any)?.artisan?.featured_until
    : products.find((p) => p.id === productId)?.featured_until;

  const missingTarget =
    (scope === "vendor" && !(vendor as any)?.vendor) ||
    (scope === "artisan" && !(artisan as any)?.artisan) ||
    (scope === "product" && !productId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Plans & Featured Ads</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Grow faster on PadiPlug. Register from ₦500, upgrade to Premium, or pin your listing to the homepage.
          </p>
        </div>
        <Card className="flex items-center gap-3 rounded-2xl p-3">
          <Wallet className="h-5 w-5 text-primary" />
          <div>
            <div className="text-xs text-muted-foreground">Wallet balance</div>
            <div className="font-display text-lg font-bold">{formatMoney((wallet as any)?.balance_kobo)}</div>
          </div>
          <Button size="sm" variant="outline" asChild><Link to="/wallet">Top up</Link></Button>
        </Card>
      </div>

      <Card className="mt-6 flex flex-wrap items-end gap-3 p-4">
        <div className="flex-1 min-w-[180px]">
          <div className="mb-1 text-xs font-medium text-muted-foreground">Apply to</div>
          <Select value={scope} onValueChange={(v) => setScope(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="vendor">My vendor store</SelectItem>
              <SelectItem value="artisan">My artisan profile</SelectItem>
              <SelectItem value="product">A specific product</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {scope === "product" && (
          <div className="flex-1 min-w-[220px]">
            <div className="mb-1 text-xs font-medium text-muted-foreground">Product</div>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger><SelectValue placeholder={products.length ? "Choose a product" : "Create a product first"} /></SelectTrigger>
              <SelectContent>
                {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="text-sm">
          {currentPlan && (
            <Badge variant="secondary" className="mr-2">Current: {currentPlan}</Badge>
          )}
          {featuredUntil && new Date(featuredUntil) > new Date() && (
            <Badge className="bg-gradient-warm text-white">Featured · ends {formatDistanceToNow(new Date(featuredUntil), { addSuffix: true })}</Badge>
          )}
        </div>
      </Card>

      {missingTarget && scope !== "product" && (
        <Card className="mt-4 border-dashed p-4 text-sm text-muted-foreground">
          You don't have a {scope} profile yet.{" "}
          <Link className="text-primary underline" to={scope === "vendor" ? "/vendor" : "/artisan"}>
            Create one first
          </Link>{" "}
          to activate a plan.
        </Card>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {(Object.values(PLANS)).map((p) => {
          const Icon = ICONS[p.code as keyof typeof ICONS];
          const isFeatured = p.code === "featured_ad";
          const isCurrent = currentPlan === p.code && currentExpiry && new Date(currentExpiry) > new Date();
          return (
            <Card key={p.code} className={`relative flex flex-col p-6 ${p.code === "premium" ? "border-primary shadow-hero" : ""}`}>
              {p.code === "premium" && (
                <span className="absolute -top-2 right-4 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                  Most popular
                </span>
              )}
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-display text-xl font-bold">{p.label}</h3>
              <div className="mt-1 font-display text-3xl font-bold">
                {formatMoney(p.price_kobo)}
                <span className="ml-1 text-sm font-medium text-muted-foreground">
                  / {p.duration_days} days
                </span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{p.desc}</p>
              <ul className="mt-4 space-y-1.5 text-sm">
                {p.code === "basic" && (
                  <>
                    <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> Verified profile</li>
                    <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> Unlimited listings</li>
                    <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> Wallet & escrow protection</li>
                  </>
                )}
                {p.code === "premium" && (
                  <>
                    <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> Everything in Basic</li>
                    <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> Priority ranking in search</li>
                    <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> Premium badge on profile</li>
                    <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> Priority support</li>
                  </>
                )}
                {isFeatured && (
                  <>
                    <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> Homepage featured carousel</li>
                    <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> Top of category results</li>
                    <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> Works on vendor, artisan or a product</li>
                  </>
                )}
              </ul>
              <div className="mt-6">
                <Button
                  className="w-full"
                  disabled={!targetId || mut.isPending || (isCurrent && !isFeatured)}
                  onClick={() => targetId && mut.mutate({ planCode: p.code as any, targetId })}
                >
                  {isCurrent && !isFeatured ? "Active" : mut.isPending ? "Processing…" : `Activate ${p.label}`}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold">Purchase history</h2>
        <Card className="mt-3 overflow-hidden">
          <ul className="divide-y">
            {history.length === 0 && (
              <li className="p-6 text-center text-sm text-muted-foreground">No purchases yet.</li>
            )}
            {history.map((h: any) => (
              <li key={h.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="font-medium capitalize">{h.plan_code.replace("_", " ")} · {h.scope}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatMoney(h.amount_kobo)} · ends{" "}
                    {new Date(h.expires_at) > new Date()
                      ? formatDistanceToNow(new Date(h.expires_at), { addSuffix: true })
                      : "expired"}
                  </div>
                </div>
                <Badge variant={new Date(h.expires_at) > new Date() ? "default" : "secondary"}>
                  {new Date(h.expires_at) > new Date() ? "Active" : "Expired"}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
