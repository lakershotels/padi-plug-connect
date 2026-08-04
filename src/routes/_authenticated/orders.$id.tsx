import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getOrder, confirmDone, openDispute, markFulfilled, submitReview, addDisputeEvidence, getMyDispute,
  acceptOrder, cancelOrder, respondToDispute,
} from "@/lib/orders.functions";
import { ImageUploader } from "@/components/image-uploader";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle2, AlertTriangle, ShieldCheck, PackageCheck, Star, Receipt, XCircle, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/orders/$id")({
  head: () => ({
    meta: [
      { title: "Order & escrow — PadiPlug" },
      { name: "description", content: "Track your PadiPlug order, escrow status and release payment when delivered." },
    ],
  }),
  component: OrderDetail,
});

const STAGES: { key: string; label: string }[] = [
  { key: "pending_payment", label: "Pending payment" },
  { key: "awaiting_acceptance", label: "Funds in escrow — awaiting seller" },
  { key: "processing", label: "Seller accepted · processing" },
  { key: "waiting_confirmation", label: "Delivered — waiting for your confirmation" },
  { key: "completed", label: "Escrow released · completed" },
];

function OrderDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: order, isPending } = useQuery({ queryKey: ["order", id], queryFn: () => getOrder({ data: { id } }) });

  const confirmFn = useServerFn(confirmDone);
  const disputeFn = useServerFn(openDispute);
  const fulfillFn = useServerFn(markFulfilled);
  const acceptFn = useServerFn(acceptOrder);
  const cancelFn = useServerFn(cancelOrder);
  const reviewFn = useServerFn(submitReview);

  const [reason, setReason] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["order", id] });
    qc.invalidateQueries({ queryKey: ["orders"] });
    qc.invalidateQueries({ queryKey: ["wallet"] });
    qc.invalidateQueries({ queryKey: ["walletBalance"] });
  };

  const doneMut = useMutation({ mutationFn: () => confirmFn({ data: { orderId: id } }), onSuccess: () => { toast.success("Escrow released to the seller"); invalidate(); setReviewOpen(true); }, onError: (e: any) => toast.error(e.message) });
  const disputeMut = useMutation({ mutationFn: () => disputeFn({ data: { orderId: id, reason } }), onSuccess: () => { toast.success("Dispute opened — funds stay locked"); invalidate(); }, onError: (e: any) => toast.error(e.message) });
  const fulfillMut = useMutation({ mutationFn: () => fulfillFn({ data: { orderId: id } }), onSuccess: () => { toast.success("Customer notified"); invalidate(); }, onError: (e: any) => toast.error(e.message) });
  const acceptMut = useMutation({ mutationFn: () => acceptFn({ data: { orderId: id } }), onSuccess: () => { toast.success("Order accepted"); invalidate(); }, onError: (e: any) => toast.error(e.message) });
  const cancelMut = useMutation({ mutationFn: () => cancelFn({ data: { orderId: id, reason: "Seller cancelled" } }), onSuccess: () => { toast.success("Order cancelled — customer refunded"); invalidate(); }, onError: (e: any) => toast.error(e.message) });
  const reviewMut = useMutation({ mutationFn: () => reviewFn({ data: { orderId: id, rating, comment } }), onSuccess: () => { toast.success("Thanks for the review!"); setReviewOpen(false); }, onError: (e: any) => toast.error(e.message) });

  if (isPending) return <div className="py-24 text-center text-muted-foreground">Loading…</div>;
  if (!order) throw notFound();

  const o = order as any;
  const isCustomer = user?.id === o.customer_id;
  const isSeller = user?.id === (o.vendors?.owner_id ?? o.artisans?.owner_id);
  const stage: string = o.stage ?? "awaiting_acceptance";
  const canConfirm = isCustomer && ["paid_escrow", "fulfilled"].includes(o.status);
  const canAccept = isSeller && stage === "awaiting_acceptance" && o.status === "paid_escrow";
  const canFulfill = isSeller && o.status === "paid_escrow" && stage !== "awaiting_acceptance";
  const canCancel = isSeller && o.status === "paid_escrow";
  const isReleased = ["released", "completed", "resolved_release"].includes(o.status);
  const stageIndex = STAGES.findIndex((s) => s.key === stage);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Order #{String(o.id).slice(0, 8)}
            {o.escrow?.escrow_ref && <> · Escrow {o.escrow.escrow_ref}</>}
          </div>
          <h1 className="font-display text-3xl font-bold">{o.kind === "product" ? o.vendors?.store_name : o.artisans?.display_name}</h1>
        </div>
        <Badge className="capitalize">{String(stage).replace(/_/g, " ")}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <h2 className="font-display text-lg font-semibold">Escrow status</h2>
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-secondary/50 p-4 text-sm">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span>
                {o.status === "paid_escrow" && `${formatMoney(o.total_kobo)} is locked in escrow. The seller cannot withdraw it until you confirm.`}
                {o.status === "fulfilled" && "The seller marked this delivered. Tap DONE to release, or Report issue."}
                {isReleased && "Payment released to the seller."}
                {o.status === "disputed" && "Funds are frozen while our team reviews the dispute."}
                {o.status === "resolved_refund" && "Refunded to your wallet."}
                {o.status === "cancelled" && "Cancelled and refunded."}
                {o.status === "pending_payment" && "Awaiting payment."}
              </span>
            </div>

            <ol className="mt-4 space-y-2">
              {STAGES.map((s, i) => {
                const done = stageIndex >= i && stageIndex !== -1;
                return (
                  <li key={s.key} className="flex items-center gap-2 text-sm">
                    {done ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
                    <span className={done ? "font-medium" : "text-muted-foreground"}>{s.label}</span>
                  </li>
                );
              })}
              {o.status === "disputed" && (
                <li className="flex items-center gap-2 text-sm text-destructive"><AlertTriangle className="h-4 w-4" />Dispute open — admin investigation</li>
              )}
            </ol>

            {isCustomer && canConfirm && (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <Button
                  size="lg"
                  className="bg-success text-primary-foreground shadow-elevated hover:opacity-95"
                  disabled={doneMut.isPending}
                  onClick={() => doneMut.mutate()}
                >
                  <CheckCircle2 className="mr-2 h-5 w-5" />DONE — release payment
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="lg" variant="destructive">
                      <AlertTriangle className="mr-2 h-5 w-5" />REPORT ISSUE
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Report an issue</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground">Escrow stays locked until an admin decides. You can add photos after submitting.</p>
                    <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe what happened (minimum 10 characters)…" rows={5} />
                    <DialogFooter>
                      <Button variant="destructive" disabled={reason.length < 10 || disputeMut.isPending} onClick={() => disputeMut.mutate()}>Open dispute</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {(canAccept || canFulfill || canCancel) && (
              <div className="mt-5 flex flex-wrap gap-3">
                {canAccept && (
                  <Button onClick={() => acceptMut.mutate()} disabled={acceptMut.isPending}>
                    <CheckCircle2 className="mr-2 h-5 w-5" />Accept order
                  </Button>
                )}
                {canFulfill && (
                  <Button onClick={() => fulfillMut.mutate()} disabled={fulfillMut.isPending}>
                    <PackageCheck className="mr-2 h-5 w-5" />Mark as {o.kind === "product" ? "shipped" : "service completed"}
                  </Button>
                )}
                {canCancel && (
                  <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => cancelMut.mutate()} disabled={cancelMut.isPending}>
                    <XCircle className="mr-2 h-5 w-5" />Cancel & refund customer
                  </Button>
                )}
              </div>
            )}

            {isReleased && isCustomer && (
              <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
                <DialogTrigger asChild><Button variant="outline" className="mt-4"><Star className="mr-2 h-4 w-4" />Leave a review</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Rate your experience</DialogTitle></DialogHeader>
                  <div className="flex justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((r) => (
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

          {o.status === "disputed" && <DisputePanel orderId={id} isCustomer={isCustomer} isSeller={isSeller} />}

          <Card className="p-5">
            <h2 className="font-display text-lg font-semibold">Items</h2>
            <ul className="mt-3 space-y-3">
              {o.order_items?.length
                ? o.order_items.map((it: any) => (
                    <li key={it.id} className="flex items-center gap-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {it.image_snapshot && <img src={it.image_snapshot} alt={it.title_snapshot} className="h-full w-full object-cover" />}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{it.title_snapshot}</div>
                        <div className="text-xs text-muted-foreground">× {it.quantity}</div>
                      </div>
                      <div className="font-medium">{formatMoney(it.line_total_kobo)}</div>
                    </li>
                  ))
                : <li className="text-sm text-muted-foreground">Service booking</li>}
            </ul>
          </Card>

          {(o.receipts?.length ?? 0) > 0 && (
            <Card className="p-5">
              <h2 className="font-display text-lg font-semibold">Receipts</h2>
              <ul className="mt-3 space-y-2">
                {o.receipts.map((r: any) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-primary" />
                      <span className="font-mono text-xs">{r.receipt_no}</span>
                      <span className="capitalize text-muted-foreground">{String(r.kind).replace(/_/g, " ")}</span>
                    </div>
                    <span className="font-medium">{formatMoney(r.amount_kobo)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <Card className="h-fit p-5">
          <h3 className="font-display text-lg font-semibold">Summary</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatMoney(o.subtotal_kobo)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">PadiPlug commission</dt><dd className="text-muted-foreground">{formatMoney(o.commission_kobo)}</dd></div>
            <div className="mt-2 flex justify-between border-t pt-2 text-base font-semibold"><dt>Total</dt><dd>{formatMoney(o.total_kobo)}</dd></div>
          </dl>
          <div className="mt-4 space-y-1 text-xs text-muted-foreground">
            <div>Placed {new Date(o.created_at).toLocaleString()}</div>
            {o.accepted_at && <div>Accepted {new Date(o.accepted_at).toLocaleString()}</div>}
            {o.shipped_at && <div>Delivered {new Date(o.shipped_at).toLocaleString()}</div>}
            {o.delivery_deadline_at && o.status === "paid_escrow" && (
              <div>Auto-refund if not delivered by {new Date(o.delivery_deadline_at).toLocaleDateString()}</div>
            )}
            {o.completed_at && <div>Closed {new Date(o.completed_at).toLocaleString()}</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}

function DisputePanel({ orderId, isCustomer, isSeller }: { orderId: string; isCustomer: boolean; isSeller: boolean }) {
  const qc = useQueryClient();
  const addFn = useServerFn(addDisputeEvidence);
  const respondFn = useServerFn(respondToDispute);
  const { data: dispute } = useQuery({ queryKey: ["dispute", orderId], queryFn: () => getMyDispute({ data: { orderId } }) });
  const [uploading, setUploading] = useState("");
  const [response, setResponse] = useState("");

  const addMut = useMutation({
    mutationFn: (url: string) => addFn({ data: { orderId, url } }),
    onSuccess: () => { toast.success("Evidence uploaded"); setUploading(""); qc.invalidateQueries({ queryKey: ["dispute", orderId] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const respondMut = useMutation({
    mutationFn: () => respondFn({ data: { orderId, response } }),
    onSuccess: () => { toast.success("Response sent to admin"); setResponse(""); qc.invalidateQueries({ queryKey: ["dispute", orderId] }); },
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
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer's reason</div>
          <p className="mt-1 whitespace-pre-wrap">{dispute.reason}</p>
        </div>
      )}
      {(dispute as any)?.seller_response && (
        <div className="mt-3 rounded-lg border border-dashed p-3 text-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Seller's response</div>
          <p className="mt-1 whitespace-pre-wrap">{(dispute as any).seller_response}</p>
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
      {(isCustomer || isSeller) && (
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add photo, video or document evidence</div>
          <div className="mt-2">
            <ImageUploader bucket="dispute-evidence" value={uploading} onChange={(url) => { if (url) addMut.mutate(url); }} label="Upload evidence" />
          </div>
        </div>
      )}
      {isSeller && (
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your response</div>
          <Textarea className="mt-2" rows={4} value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Explain your side for the admin review…" />
          <Button className="mt-2" size="sm" disabled={response.length < 5 || respondMut.isPending} onClick={() => respondMut.mutate()}>Send response</Button>
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">Escrow stays locked until an admin refunds, releases, splits or rejects the dispute.</p>
    </Card>
  );
}
