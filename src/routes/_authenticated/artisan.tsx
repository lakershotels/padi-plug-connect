import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyArtisan, upsertArtisan, upsertService, deleteService } from "@/lib/artisan.functions";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Wrench, Trash2, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/artisan")({
  head: () => ({ meta: [{ title: "Artisan console — PadiPlug" }] }),
  component: ArtisanConsole,
});

function ArtisanConsole() {
  const qc = useQueryClient();
  const { data, isPending } = useQuery({ queryKey: ["myArtisan"], queryFn: () => getMyArtisan() });
  const upA = useServerFn(upsertArtisan);
  const upS = useServerFn(upsertService);
  const delS = useServerFn(deleteService);
  const [form, setForm] = useState({ display_name: "", profession: "", headline: "", bio: "", city: "", years_experience: "", avatar_url: "" });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [svc, setSvc] = useState({ title: "", description: "", price_from_naira: "", duration_minutes: "" });

  const saveA = useMutation({ mutationFn: () => upA({ data: { ...form, years_experience: form.years_experience ? Number(form.years_experience) : undefined } as any }), onSuccess: () => { toast.success("Profile saved"); qc.invalidateQueries({ queryKey: ["myArtisan"] }); }, onError: (e: any) => toast.error(e.message) });
  const saveS = useMutation({ mutationFn: () => upS({ data: { id: editing?.id, title: svc.title, description: svc.description, price_from_naira: Number(svc.price_from_naira), duration_minutes: svc.duration_minutes ? Number(svc.duration_minutes) : undefined } as any }), onSuccess: () => { toast.success("Service saved"); setOpen(false); setEditing(null); setSvc({ title: "", description: "", price_from_naira: "", duration_minutes: "" }); qc.invalidateQueries({ queryKey: ["myArtisan"] }); }, onError: (e: any) => toast.error(e.message) });
  const removeS = useMutation({ mutationFn: (id: string) => delS({ data: { id } }), onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["myArtisan"] }); } });

  if (isPending) return <div className="py-24 text-center text-muted-foreground">Loading…</div>;

  const artisan = data?.artisan;
  if (!artisan) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Card className="p-6">
          <Wrench className="h-8 w-8 text-sunset" />
          <h1 className="mt-3 font-display text-2xl font-bold">List your skills on PadiPlug</h1>
          <p className="text-sm text-muted-foreground">Create your artisan profile in a minute.</p>
          <div className="mt-4 space-y-3">
            <div><Label>Display name</Label><Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></div>
            <div><Label>Profession</Label><Input value={form.profession} onChange={(e) => setForm({ ...form, profession: e.target.value })} placeholder="Tailor, Plumber, Braider…" /></div>
            <div><Label>Headline</Label><Input value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} placeholder="One line that sells you" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>Years experience</Label><Input type="number" value={form.years_experience} onChange={(e) => setForm({ ...form, years_experience: e.target.value })} /></div>
            </div>
            <div><Label>Avatar URL (optional)</Label><Input value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://…" /></div>
            <div><Label>Bio</Label><Textarea rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
            <Button disabled={!form.display_name || !form.profession || saveA.isPending} onClick={() => saveA.mutate()} className="w-full bg-gradient-warm text-white hover:opacity-95">
              {saveA.isPending ? "Creating…" : "Create profile"}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">{artisan.display_name}</h1>
          <p className="text-sm text-muted-foreground">{artisan.profession}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditing(null); setSvc({ title: "", description: "", price_from_naira: "", duration_minutes: "" }); }} className="bg-gradient-warm text-white hover:opacity-95">
              <Plus className="mr-1 h-4 w-4" />Add service
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit service" : "New service"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={svc.title} onChange={(e) => setSvc({ ...svc, title: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Starting price (₦)</Label><Input type="number" value={svc.price_from_naira} onChange={(e) => setSvc({ ...svc, price_from_naira: e.target.value })} /></div>
                <div><Label>Duration (min)</Label><Input type="number" value={svc.duration_minutes} onChange={(e) => setSvc({ ...svc, duration_minutes: e.target.value })} /></div>
              </div>
              <div><Label>Description</Label><Textarea rows={4} value={svc.description} onChange={(e) => setSvc({ ...svc, description: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button onClick={() => saveS.mutate()} disabled={!svc.title || !svc.price_from_naira || saveS.isPending}>{saveS.isPending ? "Saving…" : "Save service"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6">
        {(!data?.services || data.services.length === 0) ? (
          <Card className="p-10 text-center text-sm text-muted-foreground">Add your first service to start receiving bookings.</Card>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {data.services.map((s: any) => (
              <li key={s.id} className="rounded-2xl border bg-card p-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{s.title}</div>
                    <div className="text-xs text-muted-foreground">from {formatMoney(s.price_from_kobo)}{s.duration_minutes ? ` · ${s.duration_minutes} min` : ""}</div>
                    {s.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(s); setSvc({ title: s.title, description: s.description ?? "", price_from_naira: String(s.price_from_kobo / 100), duration_minutes: s.duration_minutes ? String(s.duration_minutes) : "" }); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete?")) removeS.mutate(s.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
