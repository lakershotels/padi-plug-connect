import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { ShieldCheck, Sparkles, Search, ArrowRight, Star, MapPin, BadgeCheck, TrendingUp, Handshake, Wallet, Rocket } from "lucide-react";
import heroImg from "@/assets/hero.jpg";
import { getHomeData } from "@/lib/catalog.functions";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const homeQuery = queryOptions({ queryKey: ["home"], queryFn: () => getHomeData() });

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(homeQuery),
  component: Home,
});

function Home() {
  const { data } = useSuspenseQuery(homeQuery);

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-2 md:items-center md:py-20">
          <div className="relative z-10">
            <Badge className="mb-5 bg-gold text-gold-foreground hover:bg-gold">
              <Sparkles className="mr-1 h-3.5 w-3.5" /> Escrow-protected on every order
            </Badge>
            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
              Africa's trusted marketplace.
              <span className="block bg-gradient-warm bg-clip-text text-transparent">Shop safe. Book trusted.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-muted-foreground md:text-lg">
              Buy from verified vendors, book skilled artisans, and pay through a wallet that only releases funds when you tap <span className="font-semibold text-foreground">Done</span>.
            </p>

            <form action="/marketplace" className="mt-8 flex overflow-hidden rounded-2xl border bg-card shadow-elevated focus-within:ring-2 focus-within:ring-primary">
              <div className="grid w-12 place-items-center text-muted-foreground"><Search className="h-5 w-5" /></div>
              <input name="q" placeholder="Search Ankara, tailors, plumbers, jollof…" className="flex-1 bg-transparent py-4 text-sm outline-none" />
              <Button type="submit" className="m-1.5 bg-gradient-hero text-primary-foreground shadow-elevated hover:opacity-95">
                Search
              </Button>
            </form>

            <div className="mt-8 flex flex-wrap gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Escrow protection</div>
              <div className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-primary" /> Verified sellers</div>
              <div className="flex items-center gap-2"><Handshake className="h-4 w-4 text-primary" /> Dispute resolution</div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-warm opacity-20 blur-3xl" />
            <div className="overflow-hidden rounded-[2rem] border shadow-elevated">
              <img src={heroImg} alt="African market seller with handmade goods" width={1600} height={1200} className="h-full w-full object-cover" />
            </div>
            <div className="absolute -bottom-5 -left-5 hidden rounded-2xl border bg-card p-4 shadow-elevated sm:block">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary"><Wallet className="h-5 w-5" /></div>
                <div>
                  <div className="text-xs text-muted-foreground">Escrow released</div>
                  <div className="text-sm font-semibold">₦48,500 to Amaka's Kitchen</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORY GRID */}
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold">Browse the market</h2>
          <Link to="/marketplace" className="text-sm font-medium text-primary hover:underline">All categories →</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {data.categories.slice(0, 14).map((c) => (
            <a
              key={c.id}
              href={`/marketplace?category=${c.slug}`}
              className="group flex flex-col items-center gap-2 rounded-2xl border bg-card p-4 text-center shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-warm text-white text-lg font-bold">
                {c.name[0]}
              </span>
              <span className="text-xs font-medium leading-tight">{c.name}</span>
            </a>
          ))}
        </div>
      </section>

      {/* SPONSORED / FEATURED ADS */}
      {data.featuredProducts && data.featuredProducts.length > 0 && (
        <Section
          title="Featured today"
          subtitle="Sponsored spotlights from PadiPlug sellers"
          cta={{ to: "/plans", label: "Promote your listing" }}
        >
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {data.featuredProducts.map((p: any) => (
              <Link key={p.id} to="/products/$id" params={{ id: p.id }} className="group relative overflow-hidden rounded-2xl border bg-card shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated">
                <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-gradient-warm px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                  <Rocket className="h-3 w-3" /> Sponsored
                </span>
                <div className="aspect-square overflow-hidden bg-muted">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-muted-foreground text-sm">No image</div>
                  )}
                </div>
                <div className="p-3">
                  <div className="line-clamp-1 text-sm font-medium">{p.title}</div>
                  <div className="mt-1 font-display text-base font-semibold text-primary">{formatMoney(p.price_kobo)}</div>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* FEATURED VENDORS */}
      <Section
        title="Featured vendors"
        subtitle="Handpicked stores loved by the PadiPlug community"
        cta={{ to: "/marketplace", label: "See all vendors" }}
      >
        {data.featuredVendors.length === 0 ? (
          <EmptyStrip label="Featured vendors will appear here." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.featuredVendors.map((v) => (
              <Link key={v.id} to="/vendors/$slug" params={{ slug: v.slug }} className="group rounded-2xl border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated">
                <div className="flex items-start gap-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-hero text-lg font-bold text-primary-foreground">
                    {v.logo_url ? <img src={v.logo_url} alt="" className="h-full w-full object-cover" /> : v.store_name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <div className="truncate font-semibold">{v.store_name}</div>
                      {v.verification === "verified" && <BadgeCheck className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{v.tagline}</div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      {v.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{v.city}</span>}
                      <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-gold text-gold" />{Number(v.rating_avg).toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>

      {/* FEATURED ARTISANS */}
      <Section
        title="Meet the artisans"
        subtitle="Verified pros ready to book"
        cta={{ to: "/artisans", label: "Browse artisans" }}
      >
        {data.featuredArtisans.length === 0 ? (
          <EmptyStrip label="Featured artisans will appear here." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.featuredArtisans.map((a) => (
              <Link key={a.id} to="/artisans/$slug" params={{ slug: a.slug }} className="group rounded-2xl border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated">
                <div className="flex items-start gap-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-warm text-lg font-bold text-white">
                    {a.avatar_url ? <img src={a.avatar_url} alt="" className="h-full w-full object-cover" /> : a.display_name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <div className="truncate font-semibold">{a.display_name}</div>
                      {a.verification === "verified" && <BadgeCheck className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{a.profession}</div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      {a.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{a.city}</span>}
                      <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-gold text-gold" />{Number(a.rating_avg).toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>

      {/* NEW PRODUCTS */}
      <Section
        title="Fresh drops"
        subtitle="Just added by our vendors"
        cta={{ to: "/marketplace", label: "Shop everything" }}
      >
        {data.newProducts.length === 0 ? (
          <EmptyStrip label="Products from real vendors will show here." />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {data.newProducts.map((p) => (
              <Link key={p.id} to="/products/$id" params={{ id: p.id }} className="group overflow-hidden rounded-2xl border bg-card shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated">
                <div className="aspect-square overflow-hidden bg-muted">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-muted-foreground text-sm">No image</div>
                  )}
                </div>
                <div className="p-3">
                  <div className="line-clamp-1 text-sm font-medium">{p.title}</div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-display text-base font-semibold text-primary">{formatMoney(p.price_kobo)}</span>
                    {p.compare_at_kobo && p.compare_at_kobo > p.price_kobo && (
                      <span className="text-xs text-muted-foreground line-through">{formatMoney(p.compare_at_kobo)}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="rounded-3xl border bg-gradient-hero p-8 text-primary-foreground md:p-12">
          <div className="max-w-2xl">
            <Badge className="mb-4 bg-white/15 text-white hover:bg-white/15">The PadiPlug promise</Badge>
            <h2 className="font-display text-3xl font-bold md:text-4xl">Your money is safe until you say Done.</h2>
            <p className="mt-3 text-primary-foreground/80">
              Every payment is held in escrow. The seller only gets paid when you confirm delivery — or an admin resolves a dispute in your favour.
            </p>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-4">
            {[
              { icon: Wallet, title: "1. Fund wallet", body: "Top up in seconds. Your balance is safe with PadiPlug." },
              { icon: TrendingUp, title: "2. Pay for order", body: "Funds move to escrow — not the seller." },
              { icon: Handshake, title: "3. Get delivery", body: "Vendor ships or artisan completes the job." },
              { icon: ShieldCheck, title: "4. Tap Done", body: "Escrow releases. Report an issue instead if something's wrong." },
            ].map((s) => (
              <div key={s.title} className="rounded-2xl bg-white/10 p-5 backdrop-blur">
                <s.icon className="h-6 w-6 text-gold" />
                <div className="mt-3 font-display text-lg font-semibold">{s.title}</div>
                <div className="mt-1 text-sm text-primary-foreground/80">{s.body}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
              <Link to="/marketplace">Start shopping <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10">
              <Link to="/sell">Become a seller</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function Section({ title, subtitle, cta, children }: { title: string; subtitle?: string; cta?: { to: string; label: string }; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {cta && <a href={cta.to} className="text-sm font-medium text-primary hover:underline">{cta.label} →</a>}
      </div>
      {children}
    </section>
  );
}

function EmptyStrip({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-card/50 p-10 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}
