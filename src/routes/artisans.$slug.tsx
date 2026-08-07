import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getArtisan } from "@/lib/catalog.functions";
import { bookService } from "@/lib/orders.functions";
import { startWithArtisan } from "@/lib/chat.functions";
import { formatMoney } from "@/lib/money";
import { BadgeCheck, MapPin, Star, Clock, ShieldCheck, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSession } from "@/hooks/use-session";

const artisanQuery = (slug: string) => queryOptions({ queryKey: ["artisan", slug], queryFn: () => getArtisan({ data: { slug } }) });

export const Route = createFileRoute("/artisans/$slug")({
  loader: async ({ params, context }) => {
    const d = await context.queryClient.ensureQueryData(artisanQuery(params.slug));
    if (!d) throw notFound();
    return d;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.artisan.display_name} — ${loaderData.artisan.profession} on PadiPlug` },
          { name: "description", content: (loaderData.artisan.headline ?? loaderData.artisan.bio ?? "").slice(0, 155) || loaderData.artisan.display_name },
          { property: "og:title", content: loaderData.artisan.display_name },
          ...(loaderData.artisan.cover_url ? [{ property: "og:image" as const, content: loaderData.artisan.cover_url }] : []),
        ]
      : [{ title: "Artisan — PadiPlug" }],
  }),
  component: ArtisanPage,
});

function ArtisanPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(artisanQuery(slug));
  const { user } = useSession();
  const navigate = useNavigate();
  const book = useServerFn(bookService);
  const startChat = useServerFn(startWithArtisan);
  const bookMut = useMutation({
    mutationFn: (serviceId: string) => book({ data: { serviceId } }),
    onSuccess: (r) => { toast.success("Booking held in escrow!"); navigate({ to: "/orders/$id", params: { id: r.orderId } }); },
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
  const chatMut = useMutation({
    mutationFn: (artisanId: string) => startChat({ data: { artisanId } }),
    onSuccess: (r: any) => navigate({ to: "/messages/$id", params: { id: r.id } }),
    onError: (e: any) => toast.error(e.message),
  });
  if (!data) return null;
  const a: any = data.artisan;

  return (
    <>
      <div className="h-40 w-full bg-gradient-warm md:h-56" style={a.cover_url ? { backgroundImage: `url(${a.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
      <div className="mx-auto max-w-7xl px-4">
        <div className="-mt-12 flex flex-wrap items-end gap-4 rounded-2xl border bg-card p-5 shadow-elevated">
          <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-warm text-2xl font-bold text-white">
            {a.avatar_url ? <img src={a.avatar_url} alt="" className="h-full w-full object-cover" /> : a.display_name[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold">{a.display_name}</h1>
              {a.verification === "verified" && <BadgeCheck className="h-5 w-5 text-primary" />}
            </div>
            <div className="text-sm text-muted-foreground">{a.profession} · {a.years_experience ? `${a.years_experience}+ yrs` : "Experienced"}</div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              {a.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{a.city}</span>}
              <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-gold text-gold" />{Number(a.rating_avg).toFixed(1)} ({a.rating_count})</span>
            </div>
          </div>
          {user && (
            <Button variant="outline" onClick={() => chatMut.mutate(a.id)} disabled={chatMut.isPending}>
              <MessageSquare className="mr-2 h-4 w-4" />Message
            </Button>
          )}
        </div>

        {a.bio && <p className="mt-6 max-w-3xl text-sm text-muted-foreground whitespace-pre-wrap">{a.bio}</p>}

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="font-display text-xl font-bold">Services</h2>
            {data.services.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">This artisan has not listed services yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {data.services.map((s: any) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-card">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{s.title}</div>
                      {s.description && <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{s.description}</div>}
                      {s.duration_minutes && <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{s.duration_minutes} min</div>}
                    </div>
                    <div className="text-right">
                      <div className="font-display font-semibold text-primary">from {formatMoney(s.price_from_kobo)}</div>
                      <Button
                        size="sm"
                        className="mt-2 bg-gradient-hero text-primary-foreground hover:opacity-95"
                        disabled={bookMut.isPending}
                        onClick={() => { if (!user) navigate({ to: "/auth" }); else bookMut.mutate(s.id); }}
                      >
                        Book with escrow
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <aside className="rounded-2xl border bg-secondary/50 p-5 text-sm">
            <div className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-primary" />How booking works</div>
            <ol className="mt-2 space-y-2 text-muted-foreground">
              <li>1. Book and pay from your wallet.</li>
              <li>2. Funds are held safely in escrow.</li>
              <li>3. Artisan completes the job.</li>
              <li>4. You tap <b>Done</b> — payment released.</li>
            </ol>
          </aside>
        </div>
      </div>
    </>
  );
}
