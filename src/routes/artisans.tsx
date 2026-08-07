import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { listArtisans } from "@/lib/catalog.functions";
import { Input } from "@/components/ui/input";
import { Search, Star, BadgeCheck, MapPin } from "lucide-react";
import { useState } from "react";

const searchSchema = z.object({ q: z.string().optional() });

export const Route = createFileRoute("/artisans")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Artisans — PadiPlug" },
      { name: "description", content: "Book verified tailors, braiders, plumbers, carpenters and more on PadiPlug." },
    ],
  }),
  component: ArtisansPage,
});

function ArtisansPage() {
  const { q } = useSearch({ from: "/artisans" });
  const navigate = useNavigate();
  const [term, setTerm] = useState(q ?? "");
  const { data, isPending } = useQuery({
    queryKey: ["artisans", q ?? ""],
    queryFn: () => listArtisans({ data: { q } }),
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Book a trusted artisan</h1>
        <p className="mt-1 text-base font-medium text-primary">Oníṣẹ́ Ọwọ́ · Mai Sana'a</p>
        <p className="text-sm text-muted-foreground">Every booking is escrow-protected. Pay only when the job is done.</p>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); navigate({ to: "/artisans", search: { q: term || undefined } }); }}
        className="mb-6 flex overflow-hidden rounded-xl border bg-card"
      >
        <div className="grid w-11 place-items-center text-muted-foreground"><Search className="h-4 w-4" /></div>
        <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search tailors, braiders, plumbers…" className="border-0 shadow-none focus-visible:ring-0" />
      </form>

      {isPending ? (
        <div className="py-24 text-center text-muted-foreground">Loading…</div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-16 text-center text-sm text-muted-foreground">
          No artisans yet. <a href="/sell" className="text-primary hover:underline">List your skills</a>.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((a: any) => (
            <a key={a.id} href={`/artisans/${a.slug}`} className="group flex gap-4 rounded-2xl border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated">
              <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-warm text-lg font-bold text-white">
                {a.avatar_url ? <img src={a.avatar_url} alt="" className="h-full w-full object-cover" /> : a.display_name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <div className="truncate font-semibold">{a.display_name}</div>
                  {a.verification === "verified" && <BadgeCheck className="h-4 w-4 text-primary" />}
                </div>
                <div className="text-sm text-muted-foreground">{a.profession}</div>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  {a.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{a.city}</span>}
                  <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-gold text-gold" />{Number(a.rating_avg).toFixed(1)} ({a.rating_count})</span>
                </div>
                {a.headline && <div className="mt-2 line-clamp-2 text-xs text-muted-foreground">{a.headline}</div>}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
