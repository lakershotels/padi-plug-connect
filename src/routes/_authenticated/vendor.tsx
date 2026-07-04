import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyVendor, upsertVendor, upsertProduct, deleteProduct } from "@/lib/vendor.functions";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Store, Trash2, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/vendor")({
  head: () => ({ meta: [{ title: "Vendor console — PadiPlug" }] }),
  component: VendorConsole,
});

function VendorConsole() {
  const qc = useQueryClient();
  const { data, isPending } = useQuery({ queryKey: ["myVendor"], queryFn: () => getMyVendor() });
  const upsertV = useServerFn(upsertVendor);
  const upsertP = useServerFn(upsertProduct);
  const delP = useServerFn(deleteProduct);

  const [form, setForm] = useState({ store_name: "", tagline: "", description: "", city: "", logo_url: "" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [prod, setProd] = useState({ title: "", description: "", price_naira: "", stock: "10", image_url: "" });

  const saveV = useMutation({
    mutationFn: () => upsertV({ data: { ...form } as any }),
    onSuccess: () => { toast.success("Store saved"); qc.invalidateQueries({ queryKey: ["myVendor"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const saveP = useMutation({
    mutationFn: () => upsertP({ data: { id: editing?.id, title: prod.title, description: prod.description, price_naira: Number(prod.price_naira), stock: Number(prod.stock), image_url: prod.image_url } as any }),
    onSuccess: () => { toast.success("Product saved"); setDialogOpen(false); setEditing(null); setProd({ title: "", description: "", price_naira: "", stock: "10", image_url: "" }); qc.invalidateQueries({ queryKey: ["myVendor"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const removeP = useMutation({
    mutationFn: (id: string) => delP({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["myVendor"] }); },
  });

  if (isPending) return <div className="py-24 text-center text-muted-foreground">Loading…</div>;

  const vendor = data?.vendor;

  if (!vendor) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Card className="p-6">
          <Store className="h-8 w-8 text-primary" />
          <h1 className="mt-3 font-display text-2xl font-bold">Open your PadiPlug store</h1>
          <p className="text-sm text-muted-foreground">Take a minute to set up your shop. You can add products right after.</p>
          <div className="mt-4 space-y-3">
            <div><Label>Store name</Label><Input value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} /></div>
            <div><Label>Tagline</Label><Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="e.g. Handmade leather goods from Kano" /></div>
            <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div><Label>Logo URL (optional)</Label><Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://…" /></div>
            <div><Label>About your store</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></div>
            <Button disabled={!form.store_name || saveV.isPending} onClick={() => saveV.mutate()} className="w-full bg-gradient-hero text-primary-foreground hover:opacity-95">
              {saveV.isPending ? "Creating…" : "Open store"}
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
          <h1 className="font-display text-3xl font-bold">{vendor.store_name}</h1>
          <p className="text-sm text-muted-foreground">{vendor.tagline || "Manage your products and orders here."}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditing(null); setProd({ title: "", description: "", price_naira: "", stock: "10", image_url: "" }); }} className="bg-gradient-hero text-primary-foreground hover:opacity-95">
              <Plus className="mr-1 h-4 w-4" />Add product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={prod.title} onChange={(e) => setProd({ ...prod, title: e.target.value })} /></div>
              <div><Label>Image URL</Label><Input value={prod.image_url} onChange={(e) => setProd({ ...prod, image_url: e.target.value })} placeholder="https://…" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Price (₦)</Label><Input type="number" value={prod.price_naira} onChange={(e) => setProd({ ...prod, price_naira: e.target.value })} /></div>
                <div><Label>Stock</Label><Input type="number" value={prod.stock} onChange={(e) => setProd({ ...prod, stock: e.target.value })} /></div>
              </div>
              <div><Label>Description</Label><Textarea rows={4} value={prod.description} onChange={(e) => setProd({ ...prod, description: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button onClick={() => saveP.mutate()} disabled={!prod.title || !prod.price_naira || saveP.isPending}>{saveP.isPending ? "Saving…" : "Save product"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6">
        {(!data?.products || data.products.length === 0) ? (
          <Card className="p-10 text-center text-sm text-muted-foreground">No products yet. Add your first product to start selling.</Card>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {data.products.map((p: any) => (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-card">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {p.images?.[0] && <img src={p.images[0]} className="h-full w-full object-cover" alt="" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{p.title}</div>
                  <div className="text-xs text-muted-foreground">{formatMoney(p.price_kobo)} · stock {p.stock}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setProd({ title: p.title, description: p.description ?? "", price_naira: String(p.price_kobo / 100), stock: String(p.stock), image_url: p.images?.[0] ?? "" }); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete this product?")) removeP.mutate(p.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
