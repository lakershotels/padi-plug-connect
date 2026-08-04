import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getWallet, fundWallet, requestWithdrawal } from "@/lib/wallet.functions";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown, ArrowUp, Wallet as WalletIcon, ShieldCheck, Info, Copy, Landmark, CreditCard,
  Apple, Smartphone, Hash, Receipt, Banknote, CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet & Escrow — PadiPlug" },
      { name: "description", content: "Fund your PadiPlug wallet, track escrow, receipts and withdrawals." },
    ],
  }),
  component: WalletPage,
});

const METHODS = [
  { id: "bank_transfer", label: "Bank transfer", icon: Landmark },
  { id: "card", label: "Debit / Credit card", icon: CreditCard },
  { id: "apple_pay", label: "Apple Pay", icon: Apple },
  { id: "google_pay", label: "Google Pay", icon: Smartphone },
  { id: "virtual_account", label: "Virtual account", icon: Hash },
] as const;

type Tab = "transactions" | "escrow" | "receipts" | "withdrawals";

function WalletPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["wallet"], queryFn: () => getWallet() });
  const fund = useServerFn(fundWallet);
  const withdraw = useServerFn(requestWithdrawal);

  const [amount, setAmount] = useState("5000");
  const [method, setMethod] = useState<(typeof METHODS)[number]["id"]>("card");
  const [payOpen, setPayOpen] = useState(false);
  const [success, setSuccess] = useState<{ receipt_no: string; reference: string } | null>(null);

  const [wdOpen, setWdOpen] = useState(false);
  const [wd, setWd] = useState({ amountNaira: "", bankName: "", accountNumber: "", accountName: "" });

  const fundMut = useMutation({
    mutationFn: () => fund({ data: { amountNaira: Number(amount), method } }),
    onSuccess: (r: any) => {
      setPayOpen(false);
      setSuccess({ receipt_no: r.receipt_no, reference: r.reference });
      toast.success("Payment successful — wallet credited");
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["walletBalance"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const wdMut = useMutation({
    mutationFn: () =>
      withdraw({
        data: {
          amountNaira: Number(wd.amountNaira),
          bankName: wd.bankName,
          accountNumber: wd.accountNumber,
          accountName: wd.accountName,
        },
      }),
    onSuccess: () => {
      setWdOpen(false);
      toast.success("Withdrawal requested");
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [tab, setTab] = useState<Tab>("transactions");
  const [filter, setFilter] = useState<"all" | "credits" | "debits">("all");
  const allTxns: any[] = data?.txns ?? [];
  const txns = allTxns.filter((t) => (filter === "all" ? true : filter === "credits" ? t.amount_kobo > 0 : t.amount_kobo < 0));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold">Wallet</h1>
      <p className="text-sm text-muted-foreground">Fund your wallet, pay with escrow protection, and withdraw earnings.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-hero p-6 text-primary-foreground shadow-elevated">
          <div className="flex items-center gap-2 text-sm opacity-90"><WalletIcon className="h-4 w-4" /> Available</div>
          <div className="mt-1 font-display text-3xl font-bold">{formatMoney(data?.wallet?.balance_kobo)}</div>
          <p className="mt-3 text-xs opacity-80">Spendable now and withdrawable.</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" /> In escrow</div>
          <div className="mt-1 font-display text-3xl font-bold">{formatMoney(data?.wallet?.escrow_kobo)}</div>
          <p className="mt-3 text-xs text-muted-foreground">Locked until you confirm delivery.</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Info className="h-4 w-4" /> Pending payout</div>
          <div className="mt-1 font-display text-3xl font-bold">{formatMoney(data?.wallet?.pending_kobo)}</div>
          <p className="mt-3 text-xs text-muted-foreground">Withdrawals being processed.</p>
        </Card>
      </div>

      {success && (
        <Card className="mt-6 border-success/40 bg-success/5 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
            <div>
              <div className="font-display font-semibold">Payment successful</div>
              <p className="text-sm text-muted-foreground">
                Receipt <span className="font-mono">{success.receipt_no}</span> · Ref <span className="font-mono">{success.reference}</span>
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setSuccess(null)}>Dismiss</Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="mt-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold">Fund your wallet</h2>
            <p className="text-sm text-muted-foreground">Sandbox mode — test the full escrow flow without real money.</p>
          </div>
          <Dialog open={wdOpen} onOpenChange={setWdOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Banknote className="mr-2 h-4 w-4" />Withdraw</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Withdraw to bank</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Amount (₦)" type="number" value={wd.amountNaira} onChange={(e) => setWd({ ...wd, amountNaira: e.target.value })} />
                <Input placeholder="Bank name" value={wd.bankName} onChange={(e) => setWd({ ...wd, bankName: e.target.value })} />
                <Input placeholder="Account number" value={wd.accountNumber} onChange={(e) => setWd({ ...wd, accountNumber: e.target.value })} />
                <Input placeholder="Account name" value={wd.accountName} onChange={(e) => setWd({ ...wd, accountName: e.target.value })} />
              </div>
              <DialogFooter>
                <Button disabled={wdMut.isPending || !wd.amountNaira || !wd.bankName || !wd.accountNumber} onClick={() => wdMut.mutate()}>
                  {wdMut.isPending ? "Submitting…" : "Request withdrawal"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Amount (₦)</label>
            <Input type="number" min={100} value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-40" />
          </div>
          <div className="flex flex-wrap gap-2">
            {["1000", "5000", "10000", "50000"].map((v) => (
              <Button key={v} type="button" variant="outline" size="sm" onClick={() => setAmount(v)}>+₦{Number(v).toLocaleString()}</Button>
            ))}
          </div>
          <Dialog open={payOpen} onOpenChange={setPayOpen}>
            <DialogTrigger asChild>
              <Button disabled={!amount || Number(amount) <= 0} className="bg-gradient-hero text-primary-foreground hover:opacity-95">
                Fund wallet
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Pay {formatMoney(Number(amount) * 100)}</DialogTitle></DialogHeader>
              <div className="space-y-2">
                {METHODS.map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition-colors ${method === m.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
                    >
                      <Icon className="h-5 w-5 text-primary" />
                      <span className="font-medium">{m.label}</span>
                      {method === m.id && <CheckCircle2 className="ml-auto h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
              <DialogFooter>
                <Button className="w-full" disabled={fundMut.isPending} onClick={() => fundMut.mutate()}>
                  {fundMut.isPending ? "Processing payment…" : `Pay ${formatMoney(Number(amount) * 100)}`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Card>

      <div className="mt-8">
        <div className="flex flex-wrap gap-1 rounded-lg border bg-card p-1 text-sm">
          {(["transactions", "escrow", "receipts", "withdrawals"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 capitalize transition-colors ${tab === t ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "transactions" && (
          <div className="mt-4">
            <div className="flex gap-1 rounded-lg border bg-card p-1 text-xs w-fit">
              {(["all", "credits", "debits"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`rounded-md px-2.5 py-1 capitalize transition-colors ${filter === f ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {f}
                </button>
              ))}
            </div>
            {txns.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                {allTxns.length === 0 ? "No transactions yet." : `No ${filter} to show.`}
              </div>
            ) : (
              <ul className="mt-3 space-y-2">
                {txns.map((t: any) => {
                  const positive = t.amount_kobo > 0;
                  const reference = t.reference ?? t.order_id ?? t.id;
                  return (
                    <li key={t.id} className="flex items-start justify-between gap-3 rounded-xl border bg-card p-4 shadow-card">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${positive ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                          {positive ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{t.description ?? t.type}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            <span className="rounded-full border px-2 py-0.5 capitalize">{String(t.type).replace(/_/g, " ")}</span>
                            <span>{new Date(t.created_at).toLocaleString()}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => { navigator.clipboard?.writeText(String(reference)); toast.success("Reference copied"); }}
                            className="mt-1 flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            <Copy className="h-3 w-3" />
                            <span className="max-w-[220px] truncate">Ref: {reference}</span>
                          </button>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-display font-semibold ${positive ? "text-success" : ""}`}>
                          {positive ? "+" : ""}{formatMoney(t.amount_kobo)}
                        </div>
                        {t.balance_after_kobo != null && (
                          <div className="text-[11px] text-muted-foreground">Bal {formatMoney(t.balance_after_kobo)}</div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {tab === "escrow" && (
          <ul className="mt-4 space-y-2">
            {(data?.escrow ?? []).length === 0 && (
              <li className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No escrow activity yet.</li>
            )}
            {(data?.escrow ?? []).map((e: any) => (
              <li key={e.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
                <div className="min-w-0">
                  <div className="font-mono text-xs text-muted-foreground">{e.escrow_ref}</div>
                  <div className="mt-1 text-sm">{new Date(e.created_at).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <Badge variant={e.status === "held" ? "secondary" : "outline"} className="capitalize">{e.status}</Badge>
                  <div className="mt-1 font-display font-semibold">{formatMoney(e.amount_kobo)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {tab === "receipts" && (
          <ul className="mt-4 space-y-2">
            {(data?.receipts ?? []).length === 0 && (
              <li className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No receipts yet.</li>
            )}
            {(data?.receipts ?? []).map((r: any) => (
              <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Receipt className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <div className="font-mono text-xs">{r.receipt_no}</div>
                    <div className="text-xs capitalize text-muted-foreground">
                      {String(r.kind).replace(/_/g, " ")} · {new Date(r.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-display font-semibold">{formatMoney(r.amount_kobo)}</div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(r, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${r.receipt_no}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Download
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {tab === "withdrawals" && (
          <ul className="mt-4 space-y-2">
            {(data?.withdrawals ?? []).length === 0 && (
              <li className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No withdrawals yet.</li>
            )}
            {(data?.withdrawals ?? []).map((w: any) => (
              <li key={w.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
                <div className="min-w-0 text-sm">
                  <div className="font-medium">{w.destination?.bank_name} · {w.destination?.account_number}</div>
                  <div className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="capitalize">{w.status}</Badge>
                  <div className="mt-1 font-display font-semibold">{formatMoney(w.amount_kobo)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
