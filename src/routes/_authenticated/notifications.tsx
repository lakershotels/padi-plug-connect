import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getNotifications, markAllRead } from "@/lib/user.functions";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — PadiPlug" }] }),
  component: () => {
    const qc = useQueryClient();
    const { data } = useQuery({ queryKey: ["notifications"], queryFn: () => getNotifications() });
    const markFn = useServerFn(markAllRead);
    const markMut = useMutation({ mutationFn: () => markFn(), onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }) });
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold">Notifications</h1>
          <Button variant="outline" size="sm" onClick={() => markMut.mutate()}>Mark all read</Button>
        </div>
        {(!data || data.length === 0) ? (
          <div className="mt-6 rounded-2xl border border-dashed p-12 text-center text-sm text-muted-foreground">You're all caught up.</div>
        ) : (
          <ul className="mt-6 space-y-2">
            {data.map((n: any) => (
              <li key={n.id}>
                <a href={n.link ?? "#"} className={`block rounded-xl border p-4 shadow-card ${n.read_at ? "bg-card" : "bg-secondary/40"}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{n.title}</div>
                    <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</div>
                  </div>
                  {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  },
});
