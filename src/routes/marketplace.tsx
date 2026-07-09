import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { listProducts } from "@/lib/catalog.functions";
import { formatMoney } from "@/lib/money";
import { Input } from "@/components/ui/input";
import { Search, Star, BadgeCheck } from "lucide-react";
import { useState } from "react";

const searchSchema = z.object({ q: z.string().optional(), category: z.string().optional() });

export const Route = createFileRoute("/marketplace")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Marketplace — PadiPlug" },
      { name: "description", content: "Browse thousands of products from verified African vendors on PadiPlug." },
    ],
  }),
  component: Marketplace,
});

function Marketplace() {
  const { q, category } = useSearch({ from: "/marketplace" });
  const navigate = useNavigate();
  const [term, setTerm] = useState(q ?? "");
  const { data, isPending } = useQuery({
    queryKey: ["products", q ?? "", category ?? ""],
    queryFn: () => listProducts({ data: { q, category } }),
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Marketplace</h1>
          <p className="mt-1 text-base font-medium text-primary">Olùtàjà · Mai Sayarwa</p>
          <p className="text-sm text-muted-foreground">Escrow-protected shopping from verified sellers.</p>
        </div>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); navigate({ to: "/marketplace", search: { q: term || undefined, category } }); }}
        className="mb-6 flex overflow-hidden rounded-xl border bg-card"
      >
        <div className="grid w-11 place-items-center text-muted-foreground"><Search className="h-4 w-4" /></div>
        <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search products…" className="border-0 shadow-none focus-visible:ring-0" />
      </form>

      {category && <div className="mb-4 text-sm text-muted-foreground">Filtered by: <span className="font-medium text-foreground">{category}</span> · <a href="/marketplace" className="text-primary hover:underline">clear</a></div>}

      {isPending ? (
        <div className="py-24 text-center text-muted-foreground">Loading…</div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-16 text-center text-sm text-muted-foreground">
          No products yet. Be one of the first to <a href="/sell" className="text-primary hover:underline">sell on PadiPlug</a>.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
          {data.map((p: any) => (
            <a key={p.id} href={`/products/${p.id}`} className="group overflow-hidden rounded-2xl border bg-card shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated">
              <div className="aspect-square overflow-hidden bg-muted">
                {p.images?.[0] ? <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" /> : <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">No image</div>}
              </div>
              <div className="p-3">
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span className="truncate">{p.vendors?.store_name ?? "Vendor"}</span>
                  {p.vendors?.verification === "verified" && <BadgeCheck className="h-3 w-3 text-primary" />}
                </div>
                <div className="line-clamp-1 mt-0.5 text-sm font-medium">{p.title}</div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="font-display font-semibold text-primary">{formatMoney(p.price_kobo)}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Star className="h-3 w-3 fill-gold text-gold" />{Number(p.rating_avg).toFixed(1)}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
