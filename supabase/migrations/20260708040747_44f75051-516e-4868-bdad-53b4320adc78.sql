
-- Plan + featured system
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;

ALTER TABLE public.artisans
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_vendors_featured ON public.vendors (featured_until DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_artisans_featured ON public.artisans (featured_until DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products (featured_until DESC NULLS LAST);

-- Subscription/ad purchase ledger
CREATE TABLE IF NOT EXISTS public.plan_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('vendor','artisan','product')),
  target_id UUID NOT NULL,
  plan_code TEXT NOT NULL CHECK (plan_code IN ('basic','premium','featured_ad')),
  amount_kobo INTEGER NOT NULL,
  duration_days INTEGER NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.plan_purchases TO authenticated;
GRANT ALL ON public.plan_purchases TO service_role;

ALTER TABLE public.plan_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own purchases" ON public.plan_purchases
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own purchases" ON public.plan_purchases
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
