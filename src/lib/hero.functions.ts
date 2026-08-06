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
  is_pinned?: boolean;
  is_featured?: boolean;
  /** "manual" for admin-uploaded banners, otherwise auto-generated */
  source_type?: "manual" | "vendor" | "artisan" | "product";
  source_id?: string | null;
};

export type HeroOverride = {
  source_type: "vendor" | "artisan" | "product";
  source_id: string;
  is_pinned: boolean;
  is_featured: boolean;
  is_disabled: boolean;
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

const SLIDE_COLS = "id,image_url,title,subtitle,link_url,cta_label,sort_order,is_active,is_pinned,is_featured";

/**
 * Builds the automatic hero banners:
 *  - every store/artisan with an active paid plan (newest subscription first)
 *  - the newest products uploaded by those paid stores
 */
async function buildAutoSlides(db: any): Promise<HeroSlide[]> {
  const nowIso = new Date().toISOString();

  const { data: purchases } = await db
    .from("plan_purchases")
    .select("scope,target_id,plan_code,created_at,expires_at")
    .gt("expires_at", nowIso)
    .in("scope", ["vendor", "artisan"])
    .order("created_at", { ascending: false })
    .limit(40);

  const vendorIds: string[] = [];
  const artisanIds: string[] = [];
  const rank = new Map<string, number>();
  (purchases ?? []).forEach((p: any, idx: number) => {
    if (rank.has(p.target_id)) return;
    rank.set(p.target_id, idx);
    if (p.scope === "vendor") vendorIds.push(p.target_id);
    else artisanIds.push(p.target_id);
  });

  const [vendorsRes, artisansRes] = await Promise.all([
    vendorIds.length
      ? db.from("vendors").select("id,slug,store_name,tagline,banner_url,logo_url").in("id", vendorIds)
      : Promise.resolve({ data: [] }),
    artisanIds.length
      ? db.from("artisans").select("id,slug,display_name,headline,cover_url,avatar_url").in("id", artisanIds)
      : Promise.resolve({ data: [] }),
  ]);

  const slides: HeroSlide[] = [];

  for (const v of (vendorsRes.data ?? []) as any[]) {
    const img = v.banner_url || v.logo_url;
    if (!img) continue;
    slides.push({
      id: `vendor:${v.id}`,
      image_url: img,
      title: v.store_name,
      subtitle: v.tagline ?? "Sponsored store",
      link_url: `/vendors/${v.slug}`,
      cta_label: "Visit store",
      sort_order: rank.get(v.id) ?? 99,
      is_active: true,
      source_type: "vendor",
      source_id: v.id,
    });
  }

  for (const a of (artisansRes.data ?? []) as any[]) {
    const img = a.cover_url || a.avatar_url;
    if (!img) continue;
    slides.push({
      id: `artisan:${a.id}`,
      image_url: img,
      title: a.display_name,
      subtitle: a.headline ?? "Sponsored artisan",
      link_url: `/artisans/${a.slug}`,
      cta_label: "View profile",
      sort_order: rank.get(a.id) ?? 99,
      is_active: true,
      source_type: "artisan",
      source_id: a.id,
    });
  }

  if (vendorIds.length) {
    const { data: products } = await db
      .from("products")
      .select("id,title,images,price_kobo,vendor_id,created_at,vendors(slug,store_name)")
      .eq("is_active", true)
      .in("vendor_id", vendorIds)
      .order("created_at", { ascending: false })
      .limit(12);
    for (const p of (products ?? []) as any[]) {
      const img = p.images?.[0];
      if (!img) continue;
      slides.push({
        id: `product:${p.id}`,
        image_url: img,
        title: p.title,
        subtitle: p.vendors?.store_name ? `New from ${p.vendors.store_name}` : "New arrival",
        // clicking a hero banner goes to the seller page
        link_url: p.vendors?.slug ? `/vendors/${p.vendors.slug}` : `/products/${p.id}`,
        cta_label: "Shop now",
        sort_order: (rank.get(p.vendor_id) ?? 50) + 100,
        is_active: true,
        source_type: "product",
        source_id: p.id,
      });
    }
  }

  return slides;
}

function applyOverrides(slides: HeroSlide[], overrides: HeroOverride[]): HeroSlide[] {
  const map = new Map(overrides.map((o) => [`${o.source_type}:${o.source_id}`, o]));
  return slides.map((s) => {
    const o = s.source_id ? map.get(`${s.source_type}:${s.source_id}`) : undefined;
    if (!o) return s;
    return { ...s, is_pinned: o.is_pinned, is_featured: o.is_featured, is_active: !o.is_disabled };
  });
}

function order(slides: HeroSlide[]): HeroSlide[] {
  const weight = (s: HeroSlide) => (s.is_pinned ? 0 : s.is_featured ? 1 : s.source_type === "manual" ? 2 : 3);
  return [...slides].sort((a, b) => weight(a) - weight(b) || a.sort_order - b.sort_order);
}

export const getHeroSlides = createServerFn({ method: "GET" }).handler(async () => {
  const db = pub();
  const [manualRes, overridesRes, auto] = await Promise.all([
    db.from("hero_slides").select(SLIDE_COLS).eq("is_active", true).order("sort_order").order("created_at"),
    db.from("hero_auto_overrides").select("source_type,source_id,is_pinned,is_featured,is_disabled"),
    buildAutoSlides(db),
  ]);
  const manual = ((manualRes.data ?? []) as any[]).map((s) => ({ ...s, source_type: "manual" as const, source_id: null }));
  const autoWithOverrides = applyOverrides(auto, (overridesRes.data ?? []) as HeroOverride[]).filter((s) => s.is_active);
  return order([...(manual as HeroSlide[]), ...autoWithOverrides]);
});

/** Admin view: manual slides + every auto banner (including disabled ones). */
export const listHeroSlides = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const [manualRes, overridesRes, auto] = await Promise.all([
      context.supabase.from("hero_slides").select(SLIDE_COLS).order("sort_order").order("created_at"),
      context.supabase.from("hero_auto_overrides").select("source_type,source_id,is_pinned,is_featured,is_disabled"),
      buildAutoSlides(context.supabase),
    ]);
    const manual = ((manualRes.data ?? []) as any[]).map((s) => ({ ...s, source_type: "manual" as const, source_id: null }));
    const autoWithOverrides = applyOverrides(auto, (overridesRes.data ?? []) as HeroOverride[]);
    return { manual: manual as HeroSlide[], auto: order(autoWithOverrides) };
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
  is_pinned: z.boolean().default(false),
  is_featured: z.boolean().default(false),
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

/** Pin / feature / disable an automatic banner. */
export const setHeroOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        source_type: z.enum(["vendor", "artisan", "product"]),
        source_id: z.string().uuid(),
        is_pinned: z.boolean(),
        is_featured: z.boolean(),
        is_disabled: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("hero_auto_overrides")
      .upsert({ ...data, updated_by: context.userId } as any, { onConflict: "source_type,source_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
