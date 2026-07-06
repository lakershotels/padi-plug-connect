import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { listDisputes, resolveDispute, setDisputeInvestigating, isAdmin } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "@/components/image-uploader";
import { formatMoney } from "@/lib/money";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, ShieldCheck, ArrowRight, Undo2, CheckCircle2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/disputes")({
  head: () => ({ meta: [{ title: "Disputes console — PadiPlug Admin" }] }),
  component: DisputesConsole,
});

function DisputesConsole() {
  const { data: check, isPending: checking } = useQuery({ queryKey: ["isAdmin"], queryFn: () => isAdmin() });
  const enabled = !!check?.isAdmin;
  const { data, isPending } = useQuery({
    queryKey: ["adminDisputes"],
    queryFn: () => listDisputes(),
    enabled,
  });

  if (checking) return <div className="py-24 text-center text-muted-foreground">Loading…</div>;
  if (!enabled) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-3 font-display text-2xl font-bold">Admin only</h1>
        <p className="mt-2 text-sm text-muted-foreground">You don't have access to the disputes console.</p>
      </div>
    );
  }

  const disputes = data ?? [];
  const open = disputes.filter((d: any) => d.status === "open" || d.status === "investigating");
  const closed = disputes.filter((d: any) => d.status !== "open" && d.status !== "investigating");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-primary" />
          <h1 className="font-display text-3xl font-bold">Disputes console</h1>
        </div>
        <Button asChild variant="outline" size="sm"><Link to="/admin">Overview</Link></Button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Review evidence, mark under investigation, and release or refund escrow.</p>

      {isPending ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading disputes…</div>
      ) : disputes.length === 0 ? (
        <Card className="mt-8 p-10 text-center text-sm text-muted-foreground">No disputes filed yet.</Card>
      ) : (
        <div className="mt-8 space-y-8">
          <section>
            <h2 className="mb-3 font-display text-lg font-semibold">Open ({open.length})</h2>
            <div className="space-y-4">
              {open.length === 0 && (
                <Card className="p-6 text-center text-sm text-muted-foreground">No open disputes 🎉</Card>
              )}
              {open.map((d: any) => <DisputeCard key={d.id} dispute={d} />)}
            </div>
          </section>
          {closed.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-lg font-semibold">Resolved ({closed.length})</h2>
              <div className="space-y-4">
                {closed.map((d: any) => <DisputeCard key={d.id} dispute={d} readOnly />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function DisputeCard({ dispute, readOnly = false }: { dispute: any; readOnly?: boolean }) {
  const qc = useQueryClient();
  const resolveFn = useServerFn(resolveDispute);
  const investigateFn = useServerFn(setDisputeInvestigating);
  const [notes, setNotes] = useState(dispute.admin_notes ?? "");
  const [evidence, setEvidence] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["adminDisputes"] });

  const invMut = useMutation({
    mutationFn: () => investigateFn({ data: { disputeId: dispute.id, notes } as any }),
    onSuccess: () => { toast.success("Marked under investigation"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const refundMut = useMutation({
    mutationFn: () => resolveFn({ data: { disputeId: dispute.id, decision: "refund", notes } as any }),
    onSuccess: () => { toast.success("Refunded to customer"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const releaseMut = useMutation({
    mutationFn: () => resolveFn({ data: { disputeId: dispute.id, decision: "release", notes } as any }),
    onSuccess: () => { toast.success("Escrow released to seller"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const order = dispute.order;
  const sellerName = order?.vendors?.store_name ?? order?.artisans?.display_name ?? "—";
  const busy = invMut.isPending || refundMut.isPending || releaseMut.isPending;

  return (
    <Card className="overflow-hidden p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant={dispute.status === "open" ? "destructive" : "secondary"} className="capitalize">
              {dispute.status.replace(/_/g, " ")}
            </Badge>
            {order && (
              <Link to="/orders/$id" params={{ id: order.id }} className="text-xs font-mono text-muted-foreground hover:text-foreground">
                #{String(order.id).slice(0, 8)}
              </Link>
            )}
            <span className="text-xs text-muted-foreground">
              · {formatDistanceToNow(new Date(dispute.created_at), { addSuffix: true })}
            </span>
          </div>
          <div className="mt-1 text-sm">
            <span className="font-semibold">{dispute.opener?.full_name ?? "Customer"}</span>
            <ArrowRight className="mx-2 inline h-3 w-3 text-muted-foreground" />
            <span>{sellerName}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Escrow amount</div>
          <div className="font-display text-lg font-bold">{order ? formatMoney(order.total_kobo) : "—"}</div>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-muted/40 p-3 text-sm">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer's reason</div>
        <p className="mt-1 whitespace-pre-wrap">{dispute.reason}</p>
      </div>

      {(dispute.evidence_urls?.length ?? 0) > 0 && (
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Evidence</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {dispute.evidence_urls.map((u: string, i: number) => (
              <a key={i} href={u} target="_blank" rel="noreferrer" className="block h-20 w-20 overflow-hidden rounded-lg border">
                <img src={u} alt={`Evidence ${i + 1}`} className="h-full w-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}

      {!readOnly && (
        <>
          <div className="mt-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add admin evidence (optional)</label>
            <div className="mt-2">
              <ImageUploader
                bucket="dispute-evidence"
                value={evidence}
                onChange={async (url) => {
                  if (!url) return;
                  setEvidence("");
                  const urls = [...(dispute.evidence_urls ?? []), url];
                  const { supabase } = await import("@/integrations/supabase/client");
                  await supabase.from("disputes").update({ evidence_urls: urls } as any).eq("id", dispute.id);
                  invalidate();
                }}
                label="Upload evidence file"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin notes</label>
            <Textarea
              className="mt-2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Reasoning shown to internal team…"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {dispute.status === "open" && (
              <Button variant="outline" size="sm" disabled={busy} onClick={() => invMut.mutate()}>
                {invMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Mark investigating
              </Button>
            )}
            <Button
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              size="sm"
              disabled={busy}
              onClick={() => refundMut.mutate()}
            >
              {refundMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Undo2 className="mr-2 h-4 w-4" />}
              Refund customer
            </Button>
            <Button
              size="sm"
              className="bg-gradient-hero text-primary-foreground hover:opacity-95"
              disabled={busy}
              onClick={() => releaseMut.mutate()}
            >
              {releaseMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Release to seller
            </Button>
          </div>
        </>
      )}

      {readOnly && dispute.admin_notes && (
        <div className="mt-4 rounded-lg border border-dashed p-3 text-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin notes</div>
          <p className="mt-1 whitespace-pre-wrap">{dispute.admin_notes}</p>
        </div>
      )}
    </Card>
  );
}
