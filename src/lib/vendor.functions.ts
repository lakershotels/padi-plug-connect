import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "vendor";
}

export const getMyVendor = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: vendor } = await context.supabase.from("vendors").select("*").eq("owner_id", context.userId).maybeSingle();
    if (!vendor) return { vendor: null, products: [] };
    const { data: products } = await context.supabase.from("products").select("*").eq("vendor_id", vendor.id).order("created_at", { ascending: false });
    return { vendor, products: products ?? [] };
  });

export const upsertVendor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    store_name: z.string().min(2).max(60),
    tagline: z.string().max(120).optional(),
    description: z.string().max(2000).optional(),
    city: z.string().max(60).optional(),
    logo_url: z.string().url().optional().or(z.literal("")),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase.from("vendors").select("id,slug").eq("owner_id", userId).maybeSingle();
    if (existing) {
      await supabase.from("vendors").update({
        store_name: data.store_name, tagline: data.tagline ?? null, description: data.description ?? null,
        city: data.city ?? null, logo_url: data.logo_url || null,
      }).eq("id", existing.id);
      return { id: existing.id };
    }
    const base = slugify(data.store_name);
    const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { data: created, error } = await supabase.from("vendors").insert({
      owner_id: userId, slug, store_name: data.store_name, tagline: data.tagline ?? null,
      description: data.description ?? null, city: data.city ?? null, logo_url: data.logo_url || null,
    }).select("id").single();
    if (error) throw new Error(error.message);
    await supabase.from("user_roles").insert({ user_id: userId, role: "vendor" }).select();
    return { id: created.id };
  });

export const upsertProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid().optional(),
    title: z.string().min(2).max(120),
    description: z.string().max(4000).optional(),
    price_naira: z.number().positive(),
    stock: z.number().int().min(0),
    image_url: z.string().url().optional().or(z.literal("")),
    category_slug: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: vendor } = await supabase.from("vendors").select("id").eq("owner_id", userId).maybeSingle();
    if (!vendor) throw new Error("Create your vendor store first");
    let category_id: string | null = null;
    if (data.category_slug) {
      const { data: c } = await supabase.from("categories").select("id").eq("slug", data.category_slug).maybeSingle();
      category_id = c?.id ?? null;
    }
    const payload = {
      vendor_id: vendor.id,
      category_id,
      title: data.title,
      slug: slugify(data.title) + "-" + Math.random().toString(36).slice(2, 6),
      description: data.description ?? null,
      price_kobo: Math.round(data.price_naira * 100),
      stock: data.stock,
      images: data.image_url ? [data.image_url] : [],
    };
    if (data.id) {
      await supabase.from("products").update({
        title: payload.title, description: payload.description, price_kobo: payload.price_kobo,
        stock: payload.stock, images: payload.images, category_id,
      }).eq("id", data.id);
      return { id: data.id };
    }
    const { data: p, error } = await supabase.from("products").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: p.id };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase.from("products").delete().eq("id", data.id);
    return { ok: true };
  });
