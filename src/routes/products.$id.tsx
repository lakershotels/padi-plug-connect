import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useMutation } from "@tanstack/react-query";
import { getProduct } from "@/lib/catalog.functions";
import { buyNow } from "@/lib/orders.functions";
import { toggleFavoriteProduct } from "@/lib/user.functions";
import { useServerFn } from "@tanstack/react-start";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Star, BadgeCheck, ShieldCheck, MapPin, Heart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/hooks/use-session";

const productQuery = (id: string) =>
  queryOptions({ queryKey: ["product", id], queryFn: () => getProduct({ data: { id } }) });

export const Route = createFileRoute("/products/$id")({
  loader: async ({ params, context }) => {
    const d = await context.queryClient.ensureQueryData(productQuery(params.id));
    if (!d) throw notFound();
    return d;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.product.title} — PadiPlug` },
          { name: "description", content: (loaderData.product.description ?? "").slice(0, 155) || `Buy ${loaderData.product.title} with escrow on PadiPlug.` },
          { property: "og:title", content: loaderData.product.title },
          ...(loaderData.product.images?.[0] ? [{ property: "og:image" as const, content: loaderData.product.images[0] }] : []),
        ]
      : [{ title: "Product — PadiPlug" }],
  }),
  component: ProductDetail,
});

function ProductDetail() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(productQuery(id));
  const [qty, setQty] = useState(1);
  const { user } = useSession();
  const navigate = useNavigate();
  const buy = useServerFn(buyNow);
  const fav = useServerFn(toggleFavoriteProduct);

  const buyMut = useMutation({
    mutationFn: () => buy({ data: { productId: id, quantity: qty } }),
    onSuccess: (r) => { toast.success("Order placed! Funds in escrow."); navigate({ to: "/orders/$id", params: { id: r.orderId } }); },
    onError: (e: any) => {
      const msg = e?.message ?? "Something went wrong";
      if (/insufficient wallet/i.test(msg)) {
        toast.error("Insufficient wallet balance. Redirecting to fund your wallet…");
        setTimeout(() => navigate({ to: "/wallet" }), 800);
      } else {
        toast.error(msg);
      }
    },
  });

  const favMut = useMutation({
    mutationFn: () => fav({ data: { productId: id } }),
    onSuccess: (r) => toast.success(r.favorited ? "Added to favorites" : "Removed"),
    onError: (e: any) => toast.error(e.message),
  });

  if (!data) return null;
  const p: any = data.product;
  const v = p.vendors;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border bg-muted">
          {p.images?.[0] ? (
            <img src={p.images[0]} alt={p.title} className="aspect-square w-full object-cover" />
          ) : (
            <div className="aspect-square grid place-items-center text-muted-foreground">No image</div>
          )}
        </div>
        <div>
          <a href={`/vendors/${v?.slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <span>{v?.store_name}</span>
            {v?.verification === "verified" && <BadgeCheck className="h-4 w-4 text-primary" />}
            {v?.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{v.city}</span>}
          </a>
          <h1 className="mt-2 font-display text-3xl font-bold">{p.title}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Star className="h-4 w-4 fill-gold text-gold" />{Number(p.rating_avg).toFixed(1)} ({p.rating_count})</span>
            <span>Stock: {p.stock}</span>
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-display text-3xl font-bold text-primary">{formatMoney(p.price_kobo)}</span>
            {p.compare_at_kobo && p.compare_at_kobo > p.price_kobo && (
              <span className="text-muted-foreground line-through">{formatMoney(p.compare_at_kobo)}</span>
            )}
          </div>

          <p className="mt-4 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{p.description || "No description provided."}</p>

          <div className="mt-6 flex items-center gap-3">
            <div className="inline-flex items-center rounded-lg border">
              <button className="px-3 py-2 text-lg" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
              <span className="w-10 text-center text-sm">{qty}</span>
              <button className="px-3 py-2 text-lg" onClick={() => setQty(Math.min(p.stock || 1, qty + 1))}>+</button>
            </div>
            <Button
              size="lg"
              disabled={buyMut.isPending || p.stock === 0}
              className="flex-1 bg-gradient-hero text-primary-foreground shadow-elevated hover:opacity-95"
              onClick={() => {
                if (!user) { navigate({ to: "/auth" }); return; }
                buyMut.mutate();
              }}
            >
              {p.stock === 0 ? "Out of stock" : buyMut.isPending ? "Placing…" : "Buy with escrow"}
            </Button>
            <Button variant="outline" size="lg" onClick={() => { if (!user) navigate({ to: "/auth" }); else favMut.mutate(); }} aria-label="Favorite">
              <Heart className="h-5 w-5" />
            </Button>
          </div>

          <div className="mt-5 rounded-2xl border bg-secondary/50 p-4 text-sm">
            <div className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-primary" /> Escrow protection</div>
            <p className="mt-1 text-muted-foreground">Your payment sits safely in escrow. The vendor is paid only after you confirm delivery.</p>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-12">
        <h2 className="font-display text-xl font-bold">Reviews</h2>
        {data.reviews.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No reviews yet.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {data.reviews.map((r: any) => (
              <li key={r.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{r.profiles?.full_name ?? "Customer"}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Star className="h-3 w-3 fill-gold text-gold" />{r.rating}</span>
                </div>
                {r.comment && <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
