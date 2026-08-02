import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getWallet, simulateFund } from "@/lib/wallet.functions";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Wallet as WalletIcon, ShieldCheck, Info } from "lucide-react";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({ meta: [{ title: "Wallet — PadiPlug" }] }),
  component: WalletPage,
});

function WalletPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["wallet"], queryFn: () => getWallet() });
  const fund = useServerFn(simulateFund);
  const [amount, setAmount] = useState("5000");
  const fundMut = useMutation({
    mutationFn: () => fund({ data: { amountNaira: Number(amount) } }),
    onSuccess: () => { toast.success("Wallet funded"); qc.invalidateQueries({ queryKey: ["wallet"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold">Wallet</h1>
      <p className="text-sm text-muted-foreground">Fund your wallet, then shop with escrow-protected payments.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-hero p-6 text-primary-foreground shadow-elevated">
          <div className="flex items-center gap-2 text-sm opacity-90"><WalletIcon className="h-4 w-4" /> Available</div>
          <div className="mt-1 font-display text-3xl font-bold">{formatMoney(data?.wallet?.balance_kobo)}</div>
          <p className="mt-3 text-xs opacity-80">Use this balance to pay for products and bookings.</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" /> In escrow</div>
          <div className="mt-1 font-display text-3xl font-bold">{formatMoney(data?.wallet?.escrow_kobo)}</div>
          <p className="mt-3 text-xs text-muted-foreground">Held safely until you confirm delivery.</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Info className="h-4 w-4" /> Pending payout</div>
          <div className="mt-1 font-display text-3xl font-bold">{formatMoney(data?.wallet?.pending_kobo)}</div>
          <p className="mt-3 text-xs text-muted-foreground">Withdrawals being processed.</p>
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <h2 className="font-display text-xl font-bold">Fund your wallet</h2>
        <p className="text-sm text-muted-foreground">Simulated top-up for now. Paystack integration is coming next.</p>
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
          <Button onClick={() => fundMut.mutate()} disabled={fundMut.isPending || !amount} className="bg-gradient-hero text-primary-foreground hover:opacity-95">
            {fundMut.isPending ? "Funding…" : "Fund wallet"}
          </Button>
        </div>
      </Card>

      <div className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl font-bold">Transaction history</h2>
          <div className="flex gap-1 rounded-lg border bg-card p-1 text-xs">
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
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Every credit and debit on your wallet, with timestamps and reference IDs for support.
        </p>
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
                        onClick={() => {
                          navigator.clipboard?.writeText(String(reference));
                          toast.success("Reference copied");
                        }}
                        className="mt-1 flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"
                        title="Copy reference ID"
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
    </div>
  );
}
