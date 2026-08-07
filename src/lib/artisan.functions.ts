import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "artisan";
}

export const getMyArtisan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: artisan } = await context.supabase.from("artisans").select("*").eq("owner_id", context.userId).maybeSingle();
    if (!artisan) return { artisan: null, services: [] };
    const { data: services } = await context.supabase.from("services").select("*").eq("artisan_id", artisan.id).order("created_at", { ascending: false });
    return { artisan, services: services ?? [] };
  });

export const upsertArtisan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    display_name: z.string().min(2).max(60),
    profession: z.string().min(2).max(60),
    headline: z.string().max(120).optional(),
    bio: z.string().max(2000).optional(),
    city: z.string().max(60).optional(),
    years_experience: z.number().int().min(0).max(80).optional(),
    avatar_url: z.string().url().optional().or(z.literal("")),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase.from("artisans").select("id").eq("owner_id", userId).maybeSingle();
    if (existing) {
      await supabase.from("artisans").update({
        display_name: data.display_name, profession: data.profession, headline: data.headline ?? null,
        bio: data.bio ?? null, city: data.city ?? null, years_experience: data.years_experience ?? null,
        avatar_url: data.avatar_url || null,
      }).eq("id", existing.id);
      return { id: existing.id };
    }
    const slug = slugify(data.display_name) + "-" + Math.random().toString(36).slice(2, 6);
    const { data: created, error } = await supabase.from("artisans").insert({
      owner_id: userId, slug, display_name: data.display_name, profession: data.profession,
      headline: data.headline ?? null, bio: data.bio ?? null, city: data.city ?? null,
      years_experience: data.years_experience ?? null, avatar_url: data.avatar_url || null,
    }).select("id").single();
    if (error) throw new Error(error.message);
    await supabase.from("user_roles").insert({ user_id: userId, role: "artisan" }).select();
    return { id: created.id };
  });

export const upsertService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid().optional(),
    title: z.string().min(2).max(120),
    description: z.string().max(2000).optional(),
    price_from_naira: z.number().positive(),
    duration_minutes: z.number().int().positive().optional(),
    category_slug: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: artisan } = await supabase.from("artisans").select("id").eq("owner_id", userId).maybeSingle();
    if (!artisan) throw new Error("Create your artisan profile first");
    let category_id: string | null = null;
    if (data.category_slug) {
      const { data: c } = await supabase.from("categories").select("id").eq("slug", data.category_slug).maybeSingle();
      category_id = c?.id ?? null;
    }
    const payload = {
      artisan_id: artisan.id, category_id,
      title: data.title, description: data.description ?? null,
      price_from_kobo: Math.round(data.price_from_naira * 100),
      duration_minutes: data.duration_minutes ?? null,
    };
    if (data.id) {
      await supabase.from("services").update(payload).eq("id", data.id);
      return { id: data.id };
    }
    const { data: s, error } = await supabase.from("services").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: s.id };
  });

export const deleteService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase.from("services").delete().eq("id", data.id);
    return { ok: true };
  });
