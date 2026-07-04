import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getVendor } from "@/lib/catalog.functions";
import { formatMoney } from "@/lib/money";
import { BadgeCheck, MapPin, Star } from "lucide-react";

const vendorQuery = (slug: string) => queryOptions({ queryKey: ["vendor", slug], queryFn: () => getVendor({ data: { slug } }) });

export const Route = createFileRoute("/vendors/$slug")({
  loader: async ({ params, context }) => {
    const d = await context.queryClient.ensureQueryData(vendorQuery(params.slug));
    if (!d) throw notFound();
    return d;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.vendor.store_name} — PadiPlug` },
          { name: "description", content: (loaderData.vendor.tagline ?? loaderData.vendor.description ?? "").slice(0, 155) || loaderData.vendor.store_name },
          { property: "og:title", content: loaderData.vendor.store_name },
          ...(loaderData.vendor.banner_url ? [{ property: "og:image" as const, content: loaderData.vendor.banner_url }] : []),
        ]
      : [{ title: "Vendor — PadiPlug" }],
  }),
  component: VendorPage,
});

function VendorPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(vendorQuery(slug));
  if (!data) return null;
  const v: any = data.vendor;

  return (
    <>
      <div className="h-40 w-full bg-gradient-hero md:h-56" style={v.banner_url ? { backgroundImage: `url(${v.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
      <div className="mx-auto max-w-7xl px-4">
        <div className="-mt-12 flex flex-wrap items-end gap-4 rounded-2xl border bg-card p-5 shadow-elevated">
          <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-warm text-2xl font-bold text-white">
            {v.logo_url ? <img src={v.logo_url} alt="" className="h-full w-full object-cover" /> : v.store_name[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold">{v.store_name}</h1>
              {v.verification === "verified" && <BadgeCheck className="h-5 w-5 text-primary" />}
            </div>
            <div className="text-sm text-muted-foreground">{v.tagline}</div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              {v.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{v.city}</span>}
              <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-gold text-gold" />{Number(v.rating_avg).toFixed(1)} ({v.rating_count})</span>
            </div>
          </div>
        </div>

        {v.description && <p className="mt-6 max-w-3xl text-sm text-muted-foreground whitespace-pre-wrap">{v.description}</p>}

        <h2 className="mt-10 font-display text-xl font-bold">Products</h2>
        {data.products.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No products yet.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
            {data.products.map((p: any) => (
              <a key={p.id} href={`/products/${p.id}`} className="group overflow-hidden rounded-2xl border bg-card shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated">
                <div className="aspect-square overflow-hidden bg-muted">
                  {p.images?.[0] ? <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" /> : <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">No image</div>}
                </div>
                <div className="p-3">
                  <div className="line-clamp-1 text-sm font-medium">{p.title}</div>
                  <div className="mt-1 font-display font-semibold text-primary">{formatMoney(p.price_kobo)}</div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
