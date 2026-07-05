import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { listConversations } from "@/lib/chat.functions";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "Messages — PadiPlug" }] }),
  component: MessagesPage,
});

function MessagesPage() {
  const qc = useQueryClient();
  const { data: conversations = [], isPending } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => listConversations(),
  });

  useEffect(() => {
    const channel = supabase
      .channel("messages-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        qc.invalidateQueries({ queryKey: ["conversations"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold">Messages</h1>
      <p className="mt-1 text-sm text-muted-foreground">Chat with vendors, artisans and customers.</p>

      {isPending ? (
        <div className="mt-8 text-sm text-muted-foreground">Loading…</div>
      ) : conversations.length === 0 ? (
        <div className="mt-10 rounded-2xl border bg-card p-10 text-center">
          <MessageSquare className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">
            No conversations yet. Start one by tapping <em>Message</em> on any vendor or artisan.
          </p>
        </div>
      ) : (
        <ul className="mt-6 divide-y overflow-hidden rounded-2xl border bg-card shadow-card">
          {conversations.map((c: any) => (
            <li key={c.id}>
              <Link
                to="/messages/$id"
                params={{ id: c.id }}
                className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/40"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-warm text-sm font-semibold text-white">
                  {c.other.avatar_url ? (
                    <img src={c.other.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (c.other.full_name ?? "U")[0]
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate font-medium">{c.other.full_name ?? "PadiPlug user"}</div>
                    <div className="shrink-0 text-xs text-muted-foreground">
                      {c.lastAt ? formatDistanceToNow(new Date(c.lastAt), { addSuffix: true }) : ""}
                    </div>
                  </div>
                  <div className="truncate text-sm text-muted-foreground">{c.lastMessage || "New conversation"}</div>
                </div>
                {c.unread > 0 && (
                  <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground">
                    {c.unread}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
