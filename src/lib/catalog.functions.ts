import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function pub() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export const getHomeData = createServerFn({ method: "GET" }).handler(async () => {
  const supa = pub();
  const nowIso = new Date().toISOString();
  const [cats, featuredVendors, featuredArtisans, featuredProducts, newProducts, deals] = await Promise.all([
    supa.from("categories").select("id,slug,name,kind,icon").order("name"),
    supa.from("vendors").select("id,slug,store_name,tagline,logo_url,banner_url,city,verification,rating_avg,rating_count,featured_until,plan").or(`featured_until.gt.${nowIso},is_featured.eq.true`).order("featured_until", { ascending: false, nullsFirst: false }).limit(8),
    supa.from("artisans").select("id,slug,display_name,headline,avatar_url,profession,city,verification,rating_avg,rating_count,featured_until,plan").or(`featured_until.gt.${nowIso},is_featured.eq.true`).order("featured_until", { ascending: false, nullsFirst: false }).limit(8),
    supa.from("products").select("id,title,slug,price_kobo,compare_at_kobo,images,rating_avg,rating_count,vendor_id,featured_until").eq("is_active", true).gt("featured_until", nowIso).order("featured_until", { ascending: false }).limit(8),
    supa.from("products").select("id,title,slug,price_kobo,compare_at_kobo,images,rating_avg,rating_count,vendor_id").eq("is_active", true).order("created_at", { ascending: false }).limit(8),
    supa.from("products").select("id,title,slug,price_kobo,compare_at_kobo,images,rating_avg,vendor_id").eq("is_active", true).not("compare_at_kobo", "is", null).limit(8),
  ]);
  return {
    categories: cats.data ?? [],
    featuredVendors: featuredVendors.data ?? [],
    featuredArtisans: featuredArtisans.data ?? [],
    featuredProducts: featuredProducts.data ?? [],
    newProducts: newProducts.data ?? [],
    deals: deals.data ?? [],
  };
});

export const listProducts = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ q: z.string().optional(), category: z.string().optional() }).parse(d))
  .handler(async ({ data }) => {
    const supa = pub();
    let q = supa
      .from("products")
      .select("id,title,slug,price_kobo,compare_at_kobo,images,rating_avg,rating_count,vendor_id,vendors(store_name,slug,city,verification)")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(60);
    if (data.q) q = q.ilike("title", `%${data.q}%`);
    if (data.category) {
      const cat = await supa.from("categories").select("id").eq("slug", data.category).maybeSingle();
      if (cat.data) q = q.eq("category_id", cat.data.id);
    }
    const { data: rows } = await q;
    return rows ?? [];
  });

export const listArtisans = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ q: z.string().optional() }).parse(d))
  .handler(async ({ data }) => {
    const supa = pub();
    let q = supa
      .from("artisans")
      .select("id,slug,display_name,headline,avatar_url,cover_url,profession,city,verification,rating_avg,rating_count")
      .order("rating_avg", { ascending: false })
      .limit(60);
    if (data.q) q = q.or(`display_name.ilike.%${data.q}%,profession.ilike.%${data.q}%`);
    return (await q).data ?? [];
  });

export const getProduct = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const supa = pub();
    const { data: product } = await supa
      .from("products")
      .select("*,vendors(id,slug,store_name,tagline,logo_url,city,verification,rating_avg,rating_count)")
      .eq("id", data.id)
      .maybeSingle();
    if (!product) return null;
    const { data: reviews } = await supa
      .from("reviews")
      .select("id,rating,comment,created_at,customer_id,profiles(full_name,avatar_url)")
      .eq("product_id", data.id)
      .order("created_at", { ascending: false })
      .limit(20);
    return { product, reviews: reviews ?? [] };
  });

export const getArtisan = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const supa = pub();
    const { data: artisan } = await supa.from("artisans").select("*").eq("slug", data.slug).maybeSingle();
    if (!artisan) return null;
    const { data: services } = await supa.from("services").select("*").eq("artisan_id", artisan.id).eq("is_active", true);
    const { data: reviews } = await supa
      .from("reviews")
      .select("id,rating,comment,created_at,profiles(full_name,avatar_url)")
      .eq("artisan_id", artisan.id)
      .order("created_at", { ascending: false })
      .limit(20);
    return { artisan, services: services ?? [], reviews: reviews ?? [] };
  });

export const getVendor = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const supa = pub();
    const { data: vendor } = await supa.from("vendors").select("*").eq("slug", data.slug).maybeSingle();
    if (!vendor) return null;
    const { data: products } = await supa.from("products").select("*").eq("vendor_id", vendor.id).eq("is_active", true);
    return { vendor, products: products ?? [] };
  });
