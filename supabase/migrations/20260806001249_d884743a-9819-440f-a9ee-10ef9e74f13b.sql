ALTER TABLE public.hero_slides
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.hero_auto_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('vendor','artisan','product')),
  source_id uuid NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  is_disabled boolean NOT NULL DEFAULT false,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id)
);

GRANT SELECT ON public.hero_auto_overrides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hero_auto_overrides TO authenticated;
GRANT ALL ON public.hero_auto_overrides TO service_role;

ALTER TABLE public.hero_auto_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hero overrides are public readable"
  ON public.hero_auto_overrides FOR SELECT USING (true);

CREATE POLICY "Admins manage hero overrides"
  ON public.hero_auto_overrides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER t_hero_auto_overrides_updated
  BEFORE UPDATE ON public.hero_auto_overrides
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();