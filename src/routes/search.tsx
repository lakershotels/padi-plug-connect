import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useState } from "react";
import { Search as SearchIcon, Store, Hammer, Package, Wrench } from "lucide-react";
import { searchAll } from "@/lib/catalog.functions";
import { formatMoney } from "@/lib/money";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const searchSchema = z.object({ q: fallback(z.string(), "").default("") });

export const Route = createFileRoute("/search")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Search products, services & sellers — PadiPlug" },
      { name: "description", content: "Search every product, service, vendor and artisan on PadiPlug and find exactly what you need." },
      { property: "og:title", content: "Search PadiPlug" },
      { property: "og:description", content: "Find products, services, vendors and artisans across PadiPlug." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SearchPage,
});

function Empty({ label }: { label: string }) {
  return <p className="text-sm text-muted-foreground">No {label} matched your search.</p>;
}

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const [term, setTerm] = useState(q);
  const query = q.trim().slice(0, 120);

  const { data, isFetching } = useQuery({
    queryKey: ["searchAll", query],
    queryFn: () => searchAll({ data: { q: query } }),
    enabled: query.length > 0,
  });

  const total =
    (data?.products.length ?? 0) + (data?.services.length ?? 0) + (data?.vendors.length ?? 0) + (data?.artisans.length ?? 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold">Search PadiPlug</h1>
      <p className="text-sm text-muted-foreground">Products, services, vendors and artisans — all in one place.</p>

      <form
        className="mt-5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ search: { q: term } });
        }}
      >
        <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Try “ankara”, “plumber”, “hair”…" aria-label="Search PadiPlug" />
        <Button type="submit"><SearchIcon className="mr-2 h-4 w-4" />Search</Button>
      </form>

      {!query ? (
        <p className="mt-10 text-sm text-muted-foreground">Type anything above to search the whole marketplace.</p>
      ) : isFetching && !data ? (
        <div className="py-20 text-center text-muted-foreground">Searching…</div>
      ) : (
        <div className="mt-8 space-y-10">
          <p className="text-sm text-muted-foreground">{total} result{total === 1 ? "" : "s"} for “{query}”</p>

          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold"><Package className="h-5 w-5 text-primary" />Products</h2>
            {data?.products.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.products.map((p: any) => (
                  <Link key={p.id} to="/products/$id" params={{ id: p.id }}>
                    <Card className="h-full overflow-hidden transition-shadow hover:shadow-elevated">
                      {p.images?.[0] && <img src={p.images[0]} alt={p.title} loading="lazy" className="h-36 w-full object-cover" />}
                      <div className="p-4">
                        <div className="line-clamp-2 font-medium">{p.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{p.vendors?.store_name}</div>
                        <div className="mt-2 font-display font-semibold">{formatMoney(p.price_kobo)}</div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty label="products" />
            )}
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold"><Wrench className="h-5 w-5 text-primary" />Services</h2>
            {data?.services.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.services.map((s: any) => (
                  <Link key={s.id} to="/artisans/$slug" params={{ slug: s.artisans?.slug ?? "" }}>
                    <Card className="h-full p-4 transition-shadow hover:shadow-elevated">
                      <div className="line-clamp-2 font-medium">{s.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{s.artisans?.display_name} · {s.artisans?.profession}</div>
                      <div className="mt-2 font-display font-semibold">from {formatMoney(s.price_from_kobo)}</div>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty label="services" />
            )}
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold"><Store className="h-5 w-5 text-primary" />Vendors</h2>
            {data?.vendors.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.vendors.map((v: any) => (
                  <Link key={v.id} to="/vendors/$slug" params={{ slug: v.slug }}>
                    <Card className="h-full p-4 transition-shadow hover:shadow-elevated">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">{v.store_name}</div>
                        {v.verification === "verified" && <Badge className="bg-success/15 text-success">Verified</Badge>}
                      </div>
                      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{v.tagline ?? v.city}</div>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty label="vendors" />
            )}
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold"><Hammer className="h-5 w-5 text-primary" />Artisans</h2>
            {data?.artisans.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.artisans.map((a: any) => (
                  <Link key={a.id} to="/artisans/$slug" params={{ slug: a.slug }}>
                    <Card className="h-full p-4 transition-shadow hover:shadow-elevated">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">{a.display_name}</div>
                        {a.verification === "verified" && <Badge className="bg-success/15 text-success">Verified</Badge>}
                      </div>
                      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.profession} · {a.city}</div>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty label="artisans" />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
