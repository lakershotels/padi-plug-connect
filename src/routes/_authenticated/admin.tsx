import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminOverview, setVendorVerification, setArtisanVerification, isAdmin } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { ShieldCheck, Users, Store, Wrench, Package, ShoppingBag, AlertTriangle, DollarSign } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin dashboard — PadiPlug" }] }),
  component: AdminPage,
});

function AdminPage() {
  const qc = useQueryClient();
  const { data: check, isPending: checking } = useQuery({ queryKey: ["isAdmin"], queryFn: () => isAdmin() });
  const enabled = !!check?.isAdmin;

  const { data, isPending } = useQuery({
    queryKey: ["adminOverview"],
    queryFn: () => getAdminOverview(),
    enabled,
  });

  const setV = useServerFn(setVendorVerification);
  const setA = useServerFn(setArtisanVerification);
  const vMut = useMutation({
    mutationFn: (v: { id: string; verification: string }) => setV({ data: v as any }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["adminOverview"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const aMut = useMutation({
    mutationFn: (v: { id: string; verification: string }) => setA({ data: v as any }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["adminOverview"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (checking) return <div className="py-24 text-center text-muted-foreground">Loading…</div>;
  if (!enabled) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-3 font-display text-2xl font-bold">Admin only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You don't have admin access. Ask a super admin to grant you the <code>admin</code> role.
        </p>
      </div>
    );
  }
  if (isPending || !data) return <div className="py-24 text-center text-muted-foreground">Loading dashboard…</div>;

  const stats = [
    { icon: Users, label: "Users", value: data.counts.users },
    { icon: Store, label: "Vendors", value: data.counts.vendors },
    { icon: Wrench, label: "Artisans", value: data.counts.artisans },
    { icon: Package, label: "Products", value: data.counts.products },
    { icon: ShoppingBag, label: "Recent orders", value: data.counts.orders },
    { icon: AlertTriangle, label: "Disputes", value: data.counts.disputes },
    { icon: DollarSign, label: "GMV (recent)", value: formatMoney(data.counts.gmv) },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h1 className="font-display text-3xl font-bold">Admin dashboard</h1>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <s.icon className="h-5 w-5 text-primary" />
            <div className="mt-2 text-xs text-muted-foreground">{s.label}</div>
            <div className="mt-1 font-display text-xl font-bold">{s.value}</div>
          </Card>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="font-display text-xl font-bold">Vendors</h2>
        <Card className="mt-3 overflow-hidden">
          <ul className="divide-y">
            {data.vendors.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No vendors yet.</li>}
            {data.vendors.map((v: any) => (
              <li key={v.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{v.store_name}</div>
                  <div className="text-xs text-muted-foreground">{v.city ?? "—"} · ⭐ {Number(v.rating_avg).toFixed(1)}</div>
                </div>
                <Badge variant={v.verification === "verified" ? "default" : "secondary"}>{v.verification}</Badge>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => vMut.mutate({ id: v.id, verification: "verified" })}>Verify</Button>
                  <Button size="sm" variant="ghost" onClick={() => vMut.mutate({ id: v.id, verification: "rejected" })}>Reject</Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl font-bold">Artisans</h2>
        <Card className="mt-3 overflow-hidden">
          <ul className="divide-y">
            {data.artisans.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No artisans yet.</li>}
            {data.artisans.map((a: any) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{a.display_name}</div>
                  <div className="text-xs text-muted-foreground">{a.profession} · {a.city ?? "—"}</div>
                </div>
                <Badge variant={a.verification === "verified" ? "default" : "secondary"}>{a.verification}</Badge>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => aMut.mutate({ id: a.id, verification: "verified" })}>Verify</Button>
                  <Button size="sm" variant="ghost" onClick={() => aMut.mutate({ id: a.id, verification: "rejected" })}>Reject</Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl font-bold">Recent orders</h2>
        <Card className="mt-3 overflow-hidden">
          <ul className="divide-y">
            {data.orders.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No orders yet.</li>}
            {data.orders.map((o: any) => (
              <li key={o.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</div>
                  <div className="text-sm">{formatMoney(o.total_kobo)}</div>
                </div>
                <Badge variant="secondary">{o.status}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl font-bold">Open disputes</h2>
        <Card className="mt-3 overflow-hidden">
          <ul className="divide-y">
            {data.disputes.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No disputes.</li>}
            {data.disputes.map((d: any) => (
              <li key={d.id} className="p-4">
                <div className="text-sm font-medium">{d.reason ?? d.subject ?? "Dispute"}</div>
                <div className="text-xs text-muted-foreground">Status: {d.status}</div>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
