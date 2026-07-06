import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOrder, confirmDone, openDispute, markFulfilled, submitReview, addDisputeEvidence, getMyDispute } from "@/lib/orders.functions";
import { ImageUploader } from "@/components/image-uploader";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle2, AlertTriangle, ShieldCheck, PackageCheck, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/orders/$id")({
  head: () => ({ meta: [{ title: "Order — PadiPlug" }] }),
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: order, isPending } = useQuery({ queryKey: ["order", id], queryFn: () => getOrder({ data: { id } }) });

  const confirmFn = useServerFn(confirmDone);
  const disputeFn = useServerFn(openDispute);
  const fulfillFn = useServerFn(markFulfilled);
  const reviewFn = useServerFn(submitReview);

  const [reason, setReason] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);

  const invalidate = () => { qc.invalidateQueries({ queryKey: ["order", id] }); qc.invalidateQueries({ queryKey: ["orders"] }); qc.invalidateQueries({ queryKey: ["wallet"] }); };

  const doneMut = useMutation({ mutationFn: () => confirmFn({ data: { orderId: id } }), onSuccess: () => { toast.success("Payment released! Thanks."); invalidate(); setReviewOpen(true); }, onError: (e: any) => toast.error(e.message) });
  const disputeMut = useMutation({ mutationFn: () => disputeFn({ data: { orderId: id, reason } }), onSuccess: () => { toast.success("Dispute opened. Our team is on it."); invalidate(); }, onError: (e: any) => toast.error(e.message) });
  const fulfillMut = useMutation({ mutationFn: () => fulfillFn({ data: { orderId: id } }), onSuccess: () => { toast.success("Marked as fulfilled"); invalidate(); }, onError: (e: any) => toast.error(e.message) });
  const reviewMut = useMutation({ mutationFn: () => reviewFn({ data: { orderId: id, rating, comment } }), onSuccess: () => { toast.success("Thanks for the review!"); setReviewOpen(false); }, onError: (e: any) => toast.error(e.message) });

  if (isPending) return <div className="py-24 text-center text-muted-foreground">Loading…</div>;
  if (!order) throw notFound();

  const isCustomer = user?.id === (order as any).customer_id;
  const canConfirm = isCustomer && ["paid_escrow", "fulfilled"].includes(order.status);
  const canDispute = isCustomer && ["paid_escrow", "fulfilled"].includes(order.status);
  const canFulfill = !isCustomer && order.status === "paid_escrow";
  const isReleased = order.status === "released" || order.status === "completed";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Order #{String(order.id).slice(0, 8)}</div>
          <h1 className="font-display text-3xl font-bold">{order.kind === "product" ? (order as any).vendors?.store_name : (order as any).artisans?.display_name}</h1>
        </div>
        <Badge className="capitalize">{order.status.replace(/_/g, " ")}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <h2 className="font-display text-lg font-semibold">Escrow status</h2>
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-secondary/50 p-4 text-sm">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span>
                {order.status === "paid_escrow" && "Your payment is held safely. Confirm delivery to release it."}
                {order.status === "fulfilled" && "The seller marked this as fulfilled. Confirm to release the payment."}
                {isReleased && "Payment released to the seller. Thank you!"}
                {order.status === "disputed" && "This order is under dispute. Our team is reviewing."}
                {order.status === "pending_payment" && "Awaiting payment."}
              </span>
            </div>

            {isCustomer && (canConfirm || canDispute) && (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <Button
                  size="lg"
                  className="bg-gradient-hero text-primary-foreground shadow-elevated hover:opacity-95"
                  disabled={doneMut.isPending}
                  onClick={() => doneMut.mutate()}
                >
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  {order.kind === "product" ? "Order Received — Done" : "Service Completed — Done"}
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="lg" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10">
                      <AlertTriangle className="mr-2 h-5 w-5" />Report issue / Dispute
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Open a dispute</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground">Funds stay frozen in escrow. Our team will review your case.</p>
                    <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe what happened (minimum 10 characters)…" rows={5} />
                    <DialogFooter>
                      <Button variant="destructive" disabled={reason.length < 10 || disputeMut.isPending} onClick={() => disputeMut.mutate()}>Open dispute</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {canFulfill && (
              <div className="mt-5">
                <Button className="w-full" onClick={() => fulfillMut.mutate()} disabled={fulfillMut.isPending}>
                  <PackageCheck className="mr-2 h-5 w-5" />Mark as {order.kind === "product" ? "shipped" : "completed"}
                </Button>
              </div>
            )}

            {isReleased && isCustomer && (
              <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
                <DialogTrigger asChild><Button variant="outline" className="mt-4"><Star className="mr-2 h-4 w-4" />Leave a review</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Rate your experience</DialogTitle></DialogHeader>
                  <div className="flex justify-center gap-1">
                    {[1,2,3,4,5].map((r) => (
                      <button key={r} type="button" onClick={() => setRating(r)}>
                        <Star className={`h-8 w-8 ${r <= rating ? "fill-gold text-gold" : "text-muted"}`} />
                      </button>
                    ))}
                  </div>
                  <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Tell others about it (optional)…" rows={4} />
                  <DialogFooter><Button onClick={() => reviewMut.mutate()} disabled={reviewMut.isPending}>Submit review</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </Card>

          {order.status === "disputed" && <DisputePanel orderId={id} isCustomer={isCustomer} />}

          <Card className="p-5">
            <h2 className="font-display text-lg font-semibold">Items</h2>
            <ul className="mt-3 space-y-3">
              {(order as any).order_items?.map((it: any) => (
                <li key={it.id} className="flex items-center gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {it.image_snapshot && <img src={it.image_snapshot} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex-1"><div className="text-sm font-medium">{it.title_snapshot}</div><div className="text-xs text-muted-foreground">× {it.quantity}</div></div>
                  <div className="font-medium">{formatMoney(it.line_total_kobo)}</div>
                </li>
              )) ?? <li className="text-sm text-muted-foreground">Service booking</li>}
            </ul>
          </Card>
        </div>

        <Card className="h-fit p-5">
          <h3 className="font-display text-lg font-semibold">Summary</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatMoney(order.subtotal_kobo)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">PadiPlug commission</dt><dd className="text-muted-foreground">{formatMoney(order.commission_kobo)}</dd></div>
            <div className="mt-2 flex justify-between border-t pt-2 text-base font-semibold"><dt>Total</dt><dd>{formatMoney(order.total_kobo)}</dd></div>
          </dl>
          <div className="mt-4 text-xs text-muted-foreground">Placed {new Date((order as any).created_at).toLocaleString()}</div>
        </Card>
      </div>
    </div>
  );
}

function DisputePanel({ orderId, isCustomer }: { orderId: string; isCustomer: boolean }) {
  const qc = useQueryClient();
  const addFn = useServerFn(addDisputeEvidence);
  const { data: dispute } = useQuery({
    queryKey: ["dispute", orderId],
    queryFn: () => getMyDispute({ data: { orderId } }),
  });
  const [uploading, setUploading] = useState("");

  const addMut = useMutation({
    mutationFn: (url: string) => addFn({ data: { orderId, url } }),
    onSuccess: () => {
      toast.success("Evidence uploaded");
      setUploading("");
      qc.invalidateQueries({ queryKey: ["dispute", orderId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <h2 className="font-display text-lg font-semibold">Dispute in progress</h2>
      </div>
      {dispute?.reason && (
        <div className="mt-3 rounded-lg bg-muted/40 p-3 text-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reason</div>
          <p className="mt-1 whitespace-pre-wrap">{dispute.reason}</p>
        </div>
      )}
      {(dispute?.evidence_urls?.length ?? 0) > 0 && (
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Uploaded evidence</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {dispute!.evidence_urls!.map((u: string, i: number) => (
              <a key={i} href={u} target="_blank" rel="noreferrer" className="block h-20 w-20 overflow-hidden rounded-lg border">
                <img src={u} alt={`Evidence ${i + 1}`} className="h-full w-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}
      {isCustomer && (
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add photo evidence</div>
          <div className="mt-2">
            <ImageUploader
              bucket="dispute-evidence"
              value={uploading}
              onChange={(url) => { if (url) addMut.mutate(url); }}
              label="Upload photo"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Our admin team reviews evidence and decides whether to refund you or release funds to the seller.</p>
        </div>
      )}
    </Card>
  );
}
