import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type HeroSlide = {
  id: string;
  image_url: string;
  title: string | null;
  subtitle: string | null;
  link_url: string | null;
  cta_label: string | null;
  sort_order: number;
  is_active: boolean;
};

function pub() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

async function assertAdmin(supabase: any, userId: string) {
  const { data: a } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  const { data: sa } = await supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" });
  if (!a && !sa) throw new Error("Forbidden");
}

export const getHeroSlides = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await pub()
    .from("hero_slides")
    .select("id,image_url,title,subtitle,link_url,cta_label,sort_order,is_active")
    .eq("is_active", true)
    .order("sort_order")
    .order("created_at");
  return (data ?? []) as HeroSlide[];
});

export const listHeroSlides = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("hero_slides")
      .select("id,image_url,title,subtitle,link_url,cta_label,sort_order,is_active")
      .order("sort_order")
      .order("created_at");
    return (data ?? []) as HeroSlide[];
  });

const slideSchema = z.object({
  id: z.string().uuid().optional(),
  image_url: z.string().min(1),
  title: z.string().optional().nullable(),
  subtitle: z.string().optional().nullable(),
  link_url: z.string().optional().nullable(),
  cta_label: z.string().optional().nullable(),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

export const saveHeroSlide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => slideSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const row = { ...data, created_by: context.userId };
    if (data.id) {
      const { error } = await context.supabase.from("hero_slides").update(row as any).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("hero_slides").insert(row as any);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteHeroSlide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("hero_slides").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
