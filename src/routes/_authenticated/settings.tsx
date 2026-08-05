import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { deleteMyAccount } from "@/lib/user.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Trash2, FileText, Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings & account — PadiPlug" },
      { name: "description", content: "Manage your PadiPlug account, review our privacy policy and terms, or permanently delete your account." },
      { property: "og:title", content: "Settings & account — PadiPlug" },
      { property: "og:description", content: "Manage your PadiPlug account, privacy choices, and account deletion." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState("");
  const del = useServerFn(deleteMyAccount);

  const mut = useMutation({
    mutationFn: () => del({ data: { confirm: "DELETE" as const } }),
    onSuccess: async () => {
      toast.success("Your account has been permanently deleted.");
      await supabase.auth.signOut();
      navigate({ to: "/" });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not delete account"),
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Account, privacy, and app policies.</p>

      <Card className="mt-6 p-5">
        <h2 className="flex items-center gap-2 font-semibold"><FileText className="h-4 w-4 text-primary" /> Policies</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild><Link to="/privacy">Privacy policy</Link></Button>
          <Button variant="outline" size="sm" asChild><Link to="/terms">Terms of service</Link></Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Data questions: <a className="underline" href="mailto:privacy@padiplug.com">privacy@padiplug.com</a>
        </p>
      </Card>

      <Card className="mt-4 p-5">
        <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-primary" /> Your data</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You can request a copy of your personal data at any time by emailing{" "}
          <a className="underline" href="mailto:privacy@padiplug.com">privacy@padiplug.com</a>. Transaction records are kept
          for tax and anti-money-laundering compliance even after account deletion, in anonymised form.
        </p>
      </Card>

      <Card className="mt-4 border-destructive/40 p-5">
        <h2 className="flex items-center gap-2 font-semibold text-destructive"><Trash2 className="h-4 w-4" /> Delete account</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This permanently deletes your PadiPlug login, profile, saved items and messages. It cannot be undone.
          You must have an empty wallet, no escrow funds and no orders in progress.
        </p>
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium" htmlFor="confirm-delete">Type <code>DELETE</code> to confirm</label>
          <Input
            id="confirm-delete"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="DELETE"
            className="max-w-xs"
          />
          <Button
            variant="destructive"
            disabled={confirm !== "DELETE" || mut.isPending}
            onClick={() => mut.mutate()}
          >
            {mut.isPending ? "Deleting…" : "Permanently delete my account"}
          </Button>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" /> Deletion is processed immediately and confirmed on screen.
        </p>
      </Card>
    </div>
  );
}
