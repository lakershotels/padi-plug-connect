import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: convos } = await supabase
      .from("conversations")
      .select("id,user_a,user_b,last_message_at,created_at")
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)
      .order("last_message_at", { ascending: false })
      .limit(100);
    if (!convos || convos.length === 0) return [];
    const otherIds = convos.map((c) => (c.user_a === userId ? c.user_b : c.user_a));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,full_name,avatar_url")
      .in("id", otherIds);
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    // last message + unread per convo
    const ids = convos.map((c) => c.id);
    const { data: msgs } = await supabase
      .from("messages")
      .select("id,conversation_id,body,sender_id,read_at,created_at")
      .in("conversation_id", ids)
      .order("created_at", { ascending: false });
    return convos.map((c) => {
      const otherId = c.user_a === userId ? c.user_b : c.user_a;
      const cMsgs = (msgs ?? []).filter((m) => m.conversation_id === c.id);
      const last = cMsgs[0];
      const unread = cMsgs.filter((m) => m.sender_id !== userId && !m.read_at).length;
      return {
        id: c.id,
        otherId,
        other: profileMap.get(otherId) ?? { id: otherId, full_name: null, avatar_url: null },
        lastMessage: last?.body ?? "",
        lastAt: c.last_message_at,
        unread,
      };
    });
  });

export const startConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ otherUserId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.otherUserId === userId) throw new Error("Cannot message yourself");
    const [a, b] = orderedPair(userId, data.otherUserId);
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_a", a)
      .eq("user_b", b)
      .maybeSingle();
    if (existing) return { id: existing.id };
    const { data: created, error } = await supabase
      .from("conversations")
      .insert({ user_a: a, user_b: b })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id };
  });

export const getConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: convo } = await supabase
      .from("conversations")
      .select("id,user_a,user_b")
      .eq("id", data.id)
      .maybeSingle();
    if (!convo) throw new Error("Not found");
    const otherId = convo.user_a === userId ? convo.user_b : convo.user_a;
    const { data: other } = await supabase
      .from("profiles")
      .select("id,full_name,avatar_url")
      .eq("id", otherId)
      .maybeSingle();
    const { data: messages } = await supabase
      .from("messages")
      .select("id,body,sender_id,created_at,read_at")
      .eq("conversation_id", data.id)
      .order("created_at", { ascending: true });
    // mark inbound as read
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", data.id)
      .neq("sender_id", userId)
      .is("read_at", null);
    return { convo, other, messages: messages ?? [] };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ conversationId: z.string().uuid(), body: z.string().min(1).max(4000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: convo } = await supabase.from("conversations").select("id,user_a,user_b").eq("id", data.conversationId).maybeSingle();
    if (!convo) throw new Error("Not found");
    const { error } = await supabase.from("messages").insert({
      conversation_id: data.conversationId,
      sender_id: userId,
      body: data.body,
    });
    if (error) throw new Error(error.message);
    await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", data.conversationId);
    const recipientId = convo.user_a === userId ? convo.user_b : convo.user_a;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("notifications").insert({
      user_id: recipientId,
      title: "New message",
      body: data.body.slice(0, 120),
      link: `/messages/${data.conversationId}`,
    });
    return { ok: true };
  });

export const startWithVendor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ vendorId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: v } = await supabase.from("vendors").select("owner_id").eq("id", data.vendorId).maybeSingle();
    if (!v) throw new Error("Vendor not found");
    if (v.owner_id === userId) throw new Error("That's your own store");
    const [a, b] = orderedPair(userId, v.owner_id);
    const { data: existing } = await supabase.from("conversations").select("id").eq("user_a", a).eq("user_b", b).maybeSingle();
    if (existing) return { id: existing.id };
    const { data: created, error } = await supabase.from("conversations").insert({ user_a: a, user_b: b }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: created.id };
  });

export const startWithArtisan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ artisanId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: a } = await supabase.from("artisans").select("owner_id").eq("id", data.artisanId).maybeSingle();
    if (!a) throw new Error("Artisan not found");
    if (a.owner_id === userId) throw new Error("That's your own profile");
    const [ua, ub] = orderedPair(userId, a.owner_id);
    const { data: existing } = await supabase.from("conversations").select("id").eq("user_a", ua).eq("user_b", ub).maybeSingle();
    if (existing) return { id: existing.id };
    const { data: created, error } = await supabase.from("conversations").insert({ user_a: ua, user_b: ub }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: created.id };
  });
