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
        <h2 className="font-display text-xl font-bold">Transactions</h2>
        {(!data?.txns || data.txns.length === 0) ? (
          <div className="mt-3 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No transactions yet.</div>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.txns.map((t: any) => {
              const positive = t.amount_kobo > 0;
              return (
                <li key={t.id} className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-card">
                  <div className="flex items-center gap-3">
                    <div className={`grid h-9 w-9 place-items-center rounded-full ${positive ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                      {positive ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{t.description ?? t.type}</div>
                      <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className={`font-display font-semibold ${positive ? "text-success" : ""}`}>
                    {positive ? "+" : ""}{formatMoney(t.amount_kobo)}
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
