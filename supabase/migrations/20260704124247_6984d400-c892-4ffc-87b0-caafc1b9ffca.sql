
-- =========== ENUMS ===========
CREATE TYPE public.app_role AS ENUM ('customer','vendor','artisan','logistics','admin','super_admin');
CREATE TYPE public.verification_status AS ENUM ('unverified','pending','verified','rejected');
CREATE TYPE public.order_status AS ENUM ('pending_payment','paid_escrow','fulfilled','completed','released','disputed','resolved_refund','resolved_release','cancelled');
CREATE TYPE public.txn_type AS ENUM ('fund','hold','release','refund','commission','withdrawal','adjustment');
CREATE TYPE public.dispute_status AS ENUM ('open','investigating','resolved_refund','resolved_release');

-- =========== PROFILES ===========
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  city TEXT,
  country TEXT DEFAULT 'Nigeria',
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by anyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- =========== USER ROLES ===========
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- =========== AUTO PROFILE + CUSTOMER ROLE ON SIGNUP ===========
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer') ON CONFLICT DO NOTHING;
  INSERT INTO public.wallets (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- =========== WALLETS ===========
CREATE TABLE public.wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_kobo BIGINT NOT NULL DEFAULT 0,
  escrow_kobo BIGINT NOT NULL DEFAULT 0,
  pending_kobo BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.txn_type NOT NULL,
  amount_kobo BIGINT NOT NULL,
  balance_after_kobo BIGINT,
  reference TEXT,
  description TEXT,
  order_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own txns" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);

-- =========== CATEGORIES ===========
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('product','service')),
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.categories FOR SELECT USING (true);

-- =========== VENDORS ===========
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  store_name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  city TEXT,
  country TEXT DEFAULT 'Nigeria',
  verification public.verification_status NOT NULL DEFAULT 'unverified',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.vendors TO authenticated;
GRANT SELECT ON public.vendors TO anon;
GRANT ALL ON public.vendors TO service_role;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendors public read" ON public.vendors FOR SELECT USING (true);
CREATE POLICY "vendors owner insert" ON public.vendors FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "vendors owner update" ON public.vendors FOR UPDATE USING (auth.uid() = owner_id);

-- =========== ARTISANS ===========
CREATE TABLE public.artisans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  headline TEXT,
  bio TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  profession TEXT,
  city TEXT,
  country TEXT DEFAULT 'Nigeria',
  years_experience INT,
  portfolio_urls TEXT[] DEFAULT '{}',
  verification public.verification_status NOT NULL DEFAULT 'unverified',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.artisans TO authenticated;
GRANT SELECT ON public.artisans TO anon;
GRANT ALL ON public.artisans TO service_role;
ALTER TABLE public.artisans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "artisans public read" ON public.artisans FOR SELECT USING (true);
CREATE POLICY "artisans owner insert" ON public.artisans FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "artisans owner update" ON public.artisans FOR UPDATE USING (auth.uid() = owner_id);

-- =========== PRODUCTS ===========
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  price_kobo BIGINT NOT NULL CHECK (price_kobo >= 0),
  compare_at_kobo BIGINT,
  stock INT NOT NULL DEFAULT 0,
  images TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX products_vendor_idx ON public.products(vendor_id);
CREATE INDEX products_category_idx ON public.products(category_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT ON public.products TO anon;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products public read active" ON public.products FOR SELECT USING (is_active = true OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.owner_id = auth.uid()));
CREATE POLICY "products vendor manage" ON public.products FOR ALL USING (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.owner_id = auth.uid()));

-- =========== SERVICES ===========
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artisan_id UUID NOT NULL REFERENCES public.artisans(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id),
  title TEXT NOT NULL,
  description TEXT,
  price_from_kobo BIGINT NOT NULL CHECK (price_from_kobo >= 0),
  duration_minutes INT,
  images TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX services_artisan_idx ON public.services(artisan_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT SELECT ON public.services TO anon;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services public read active" ON public.services FOR SELECT USING (is_active = true OR EXISTS (SELECT 1 FROM public.artisans a WHERE a.id = artisan_id AND a.owner_id = auth.uid()));
CREATE POLICY "services artisan manage" ON public.services FOR ALL USING (EXISTS (SELECT 1 FROM public.artisans a WHERE a.id = artisan_id AND a.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.artisans a WHERE a.id = artisan_id AND a.owner_id = auth.uid()));

-- =========== ORDERS ===========
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id),
  artisan_id UUID REFERENCES public.artisans(id),
  service_id UUID REFERENCES public.services(id),
  kind TEXT NOT NULL CHECK (kind IN ('product','service')),
  subtotal_kobo BIGINT NOT NULL,
  commission_kobo BIGINT NOT NULL DEFAULT 0,
  total_kobo BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  status public.order_status NOT NULL DEFAULT 'pending_payment',
  shipping_address JSONB,
  scheduled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX orders_customer_idx ON public.orders(customer_id);
CREATE INDEX orders_vendor_idx ON public.orders(vendor_id);
CREATE INDEX orders_artisan_idx ON public.orders(artisan_id);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders customer read" ON public.orders FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "orders provider read" ON public.orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.artisans a WHERE a.id = artisan_id AND a.owner_id = auth.uid())
);
CREATE POLICY "orders customer insert" ON public.orders FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  title_snapshot TEXT NOT NULL,
  image_snapshot TEXT,
  unit_price_kobo BIGINT NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  line_total_kobo BIGINT NOT NULL
);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items via order" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (
    o.customer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = o.vendor_id AND v.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.artisans a WHERE a.id = o.artisan_id AND a.owner_id = auth.uid())
  ))
);

-- =========== DISPUTES ===========
CREATE TABLE public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  opened_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  evidence_urls TEXT[] DEFAULT '{}',
  status public.dispute_status NOT NULL DEFAULT 'open',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.disputes TO authenticated;
GRANT ALL ON public.disputes TO service_role;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "disputes participants read" ON public.disputes FOR SELECT USING (
  auth.uid() = opened_by
  OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.customer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = o.vendor_id AND v.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.artisans a WHERE a.id = o.artisan_id AND a.owner_id = auth.uid())))
  OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
);
CREATE POLICY "disputes opener insert" ON public.disputes FOR INSERT WITH CHECK (auth.uid() = opened_by);

-- =========== REVIEWS ===========
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
  artisan_id UUID REFERENCES public.artisans(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reviews TO authenticated;
GRANT SELECT ON public.reviews TO anon;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews public read" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews author insert" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- =========== FAVORITES ===========
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
  artisan_id UUID REFERENCES public.artisans(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id, vendor_id, artisan_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "favs own all" ON public.favorites FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========== NOTIFICATIONS ===========
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifs own read" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifs own update" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- =========== UPDATED_AT TRIGGER ===========
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER t_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_vendors_updated BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_artisans_updated BEFORE UPDATE ON public.artisans FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_services_updated BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_wallets_updated BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_disputes_updated BEFORE UPDATE ON public.disputes FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========== NEW USER TRIGGER ===========
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========== SEED CATEGORIES ===========
INSERT INTO public.categories (slug, name, kind, icon) VALUES
  ('fashion','Fashion & Style','product','shirt'),
  ('beauty','Beauty & Personal Care','product','sparkles'),
  ('food','Food & Groceries','product','utensils'),
  ('electronics','Electronics','product','smartphone'),
  ('home','Home & Living','product','sofa'),
  ('made-in-africa','Made in Africa','product','flag'),
  ('tailoring','Tailoring','service','scissors'),
  ('hair-braiding','Hair & Braiding','service','sparkles'),
  ('carpentry','Carpentry','service','hammer'),
  ('plumbing','Plumbing','service','wrench'),
  ('electrical','Electrical','service','zap'),
  ('cleaning','Cleaning','service','spray-can'),
  ('catering','Catering','service','chef-hat'),
  ('events','Events & Décor','service','party-popper')
ON CONFLICT (slug) DO NOTHING;
