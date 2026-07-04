import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getFavorites } from "@/lib/user.functions";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/favorites")({
  head: () => ({ meta: [{ title: "Favorites — PadiPlug" }] }),
  component: () => {
    const { data, isPending } = useQuery({ queryKey: ["favorites"], queryFn: () => getFavorites() });
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold">Favorites</h1>
        {isPending ? (
          <div className="py-16 text-center text-muted-foreground">Loading…</div>
        ) : !data || data.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed p-12 text-center text-sm text-muted-foreground">
            You have no saved items yet.
          </div>
        ) : (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((f: any) => {
              const p = f.products;
              if (!p) return null;
              return (
                <li key={f.id}>
                  <a href={`/products/${p.id}`} className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-card hover:shadow-elevated">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {p.images?.[0] && <img src={p.images[0]} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-1 text-sm font-medium">{p.title}</div>
                      <div className="text-xs text-muted-foreground">{p.vendors?.store_name}</div>
                      <div className="mt-0.5 text-sm font-semibold text-primary">{formatMoney(p.price_kobo)}</div>
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  },
});
