import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getConversation, sendMessage } from "@/lib/chat.functions";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/messages/$id")({
  head: () => ({ meta: [{ title: "Chat — PadiPlug" }] }),
  component: ChatThread,
});

function ChatThread() {
  const { id } = Route.useParams();
  const { user } = useSession();
  const qc = useQueryClient();
  const send = useServerFn(sendMessage);
  const [body, setBody] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const { data, isPending } = useQuery({
    queryKey: ["conversation", id],
    queryFn: () => getConversation({ data: { id } }),
  });

  useEffect(() => {
    const channel = supabase
      .channel(`chat-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["conversation", id] });
          qc.invalidateQueries({ queryKey: ["conversations"] });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, qc]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages?.length]);

  const submit = useMutation({
    mutationFn: () => send({ data: { conversationId: id, body: body.trim() } }),
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["conversation", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isPending) return <div className="py-24 text-center text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col px-0 md:px-4">
      <div className="flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <Button asChild size="icon" variant="ghost"><Link to="/messages"><ArrowLeft className="h-5 w-5" /></Link></Button>
        <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-gradient-warm text-sm font-semibold text-white">
          {data?.other?.avatar_url ? <img src={data.other.avatar_url} alt="" className="h-full w-full object-cover" /> : (data?.other?.full_name ?? "U")[0]}
        </div>
        <div className="font-semibold">{data?.other?.full_name ?? "PadiPlug user"}</div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {(data?.messages ?? []).map((m: any) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm shadow-sm ${
                  mine ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); if (body.trim() && !submit.isPending) submit.mutate(); }}
        className="flex items-end gap-2 border-t bg-background p-3"
      >
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (body.trim() && !submit.isPending) submit.mutate(); }
          }}
          placeholder="Write a message…"
          rows={1}
          className="max-h-40 min-h-[44px] flex-1 resize-none"
        />
        <Button type="submit" disabled={!body.trim() || submit.isPending} size="icon" className="bg-gradient-hero text-primary-foreground">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
