-- ============ columns ============
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'awaiting_acceptance',
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

ALTER TABLE public.disputes
  ADD COLUMN IF NOT EXISTS resolution text,
  ADD COLUMN IF NOT EXISTS seller_response text,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspension_reason text;

-- ============ tables ============
CREATE TABLE IF NOT EXISTS public.escrow_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_ref text NOT NULL UNIQUE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  seller_id uuid,
  amount_kobo bigint NOT NULL,
  commission_kobo bigint NOT NULL DEFAULT 0,
  released_kobo bigint NOT NULL DEFAULT 0,
  refunded_kobo bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'held',
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS escrow_one_held_per_order ON public.escrow_transactions(order_id) WHERE status = 'held';
GRANT SELECT ON public.escrow_transactions TO authenticated;
GRANT ALL ON public.escrow_transactions TO service_role;
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "escrow_read_own" ON public.escrow_transactions FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR seller_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'sandbox',
  method text NOT NULL DEFAULT 'card',
  amount_kobo bigint NOT NULL,
  currency text NOT NULL DEFAULT 'NGN',
  status text NOT NULL DEFAULT 'pending',
  reference text NOT NULL UNIQUE,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_read_own" ON public.payments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TABLE IF NOT EXISTS public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_kobo bigint NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  destination jsonb NOT NULL DEFAULT '{}'::jsonb,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "withdrawals_read_own" ON public.withdrawals FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TABLE IF NOT EXISTS public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  amount_kobo bigint NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.refunds TO authenticated;
GRANT ALL ON public.refunds TO service_role;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "refunds_read_own" ON public.refunds FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE SEQUENCE IF NOT EXISTS public.receipt_seq START 1000;
CREATE TABLE IF NOT EXISTS public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no text NOT NULL UNIQUE DEFAULT ('PP-' || to_char(now(),'YYYYMM') || '-' || nextval('public.receipt_seq')),
  user_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  kind text NOT NULL,
  amount_kobo bigint NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.receipts TO authenticated;
GRANT ALL ON public.receipts TO service_role;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "receipts_read_own" ON public.receipts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity text,
  entity_id uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_admin_read" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TABLE IF NOT EXISTS public.admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_actions TO authenticated;
GRANT ALL ON public.admin_actions TO service_role;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_actions_read" ON public.admin_actions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER t_escrow_updated BEFORE UPDATE ON public.escrow_transactions FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_withdrawals_updated BEFORE UPDATE ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- unique reference on wallet_transactions to prevent double credit
CREATE UNIQUE INDEX IF NOT EXISTS wallet_txn_ref_unique ON public.wallet_transactions(reference) WHERE reference IS NOT NULL;

-- ============ atomic money functions ============
CREATE OR REPLACE FUNCTION public.wallet_fund(_user_id uuid, _amount_kobo bigint, _reference text, _method text, _description text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _bal bigint; _pay public.payments; _rcpt public.receipts;
BEGIN
  IF _amount_kobo <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  IF EXISTS (SELECT 1 FROM public.payments WHERE reference = _reference AND status = 'successful') THEN
    RAISE EXCEPTION 'Duplicate payment reference';
  END IF;
  INSERT INTO public.wallets(user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.payments(user_id, method, amount_kobo, status, reference, meta)
    VALUES (_user_id, _method, _amount_kobo, 'successful', _reference, jsonb_build_object('description', _description))
    RETURNING * INTO _pay;
  UPDATE public.wallets SET balance_kobo = balance_kobo + _amount_kobo, updated_at = now()
    WHERE user_id = _user_id RETURNING balance_kobo INTO _bal;
  INSERT INTO public.wallet_transactions(user_id, type, amount_kobo, balance_after_kobo, reference, description)
    VALUES (_user_id, 'fund', _amount_kobo, _bal, _reference, _description);
  INSERT INTO public.receipts(user_id, payment_id, kind, amount_kobo, meta)
    VALUES (_user_id, _pay.id, 'wallet_funding', _amount_kobo, jsonb_build_object('method', _method, 'reference', _reference))
    RETURNING * INTO _rcpt;
  INSERT INTO public.audit_logs(actor_id, action, entity, entity_id, meta)
    VALUES (_user_id, 'wallet.fund', 'payment', _pay.id, jsonb_build_object('amount_kobo', _amount_kobo, 'method', _method));
  RETURN jsonb_build_object('balance_kobo', _bal, 'payment_id', _pay.id, 'receipt_no', _rcpt.receipt_no, 'reference', _reference);
END; $$;
REVOKE ALL ON FUNCTION public.wallet_fund(uuid,bigint,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_fund(uuid,bigint,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.escrow_hold(_order_id uuid, _customer_id uuid, _seller_id uuid, _amount_kobo bigint, _commission_kobo bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _bal bigint; _esc public.escrow_transactions; _ref text; _rcpt public.receipts;
BEGIN
  INSERT INTO public.wallets(user_id) VALUES (_customer_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT balance_kobo INTO _bal FROM public.wallets WHERE user_id = _customer_id FOR UPDATE;
  IF _bal IS NULL OR _bal < _amount_kobo THEN RAISE EXCEPTION 'INSUFFICIENT_FUNDS'; END IF;
  _ref := 'ESC-' || upper(substr(replace(_order_id::text,'-',''),1,10));
  INSERT INTO public.escrow_transactions(escrow_ref, order_id, customer_id, seller_id, amount_kobo, commission_kobo)
    VALUES (_ref, _order_id, _customer_id, _seller_id, _amount_kobo, _commission_kobo)
    RETURNING * INTO _esc;
  UPDATE public.wallets SET balance_kobo = balance_kobo - _amount_kobo, escrow_kobo = escrow_kobo + _amount_kobo, updated_at = now()
    WHERE user_id = _customer_id RETURNING balance_kobo INTO _bal;
  INSERT INTO public.wallet_transactions(user_id, type, amount_kobo, balance_after_kobo, reference, description, order_id)
    VALUES (_customer_id, 'hold', -_amount_kobo, _bal, _ref, 'Funds locked in escrow', _order_id);
  INSERT INTO public.receipts(user_id, order_id, kind, amount_kobo, meta)
    VALUES (_customer_id, _order_id, 'escrow_payment', _amount_kobo, jsonb_build_object('escrow_ref', _ref))
    RETURNING * INTO _rcpt;
  UPDATE public.orders SET status = 'paid_escrow', stage = 'awaiting_acceptance',
    delivery_deadline_at = now() + interval '7 days' WHERE id = _order_id;
  INSERT INTO public.audit_logs(actor_id, action, entity, entity_id, meta)
    VALUES (_customer_id, 'escrow.hold', 'order', _order_id, jsonb_build_object('amount_kobo', _amount_kobo, 'escrow_ref', _ref));
  RETURN jsonb_build_object('escrow_id', _esc.id, 'escrow_ref', _ref, 'balance_kobo', _bal, 'receipt_no', _rcpt.receipt_no);
END; $$;
REVOKE ALL ON FUNCTION public.escrow_hold(uuid,uuid,uuid,bigint,bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.escrow_hold(uuid,uuid,uuid,bigint,bigint) TO service_role;

CREATE OR REPLACE FUNCTION public.escrow_settle(_order_id uuid, _release_kobo bigint, _refund_kobo bigint, _actor_id uuid, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _esc public.escrow_transactions; _cbal bigint; _sbal bigint; _commission bigint; _payout bigint;
        _new_status text; _order_status text; _stage text;
BEGIN
  SELECT * INTO _esc FROM public.escrow_transactions WHERE order_id = _order_id AND status = 'held' FOR UPDATE;
  IF _esc.id IS NULL THEN RAISE EXCEPTION 'ESCROW_NOT_HELD'; END IF;
  IF _release_kobo < 0 OR _refund_kobo < 0 OR (_release_kobo + _refund_kobo) <> _esc.amount_kobo THEN
    RAISE EXCEPTION 'AMOUNTS_MUST_SUM_TO_ESCROW';
  END IF;

  _commission := CASE WHEN _esc.amount_kobo = 0 THEN 0
    ELSE (_esc.commission_kobo * _release_kobo) / _esc.amount_kobo END;
  _payout := _release_kobo - _commission;

  -- release escrow hold on the customer
  UPDATE public.wallets SET escrow_kobo = GREATEST(0, escrow_kobo - _esc.amount_kobo), updated_at = now()
    WHERE user_id = _esc.customer_id;

  IF _refund_kobo > 0 THEN
    UPDATE public.wallets SET balance_kobo = balance_kobo + _refund_kobo, updated_at = now()
      WHERE user_id = _esc.customer_id RETURNING balance_kobo INTO _cbal;
    INSERT INTO public.wallet_transactions(user_id, type, amount_kobo, balance_after_kobo, reference, description, order_id)
      VALUES (_esc.customer_id, 'refund', _refund_kobo, _cbal, _esc.escrow_ref || '-R', COALESCE(_reason,'Escrow refund'), _order_id);
    INSERT INTO public.refunds(order_id, user_id, amount_kobo, reason) VALUES (_order_id, _esc.customer_id, _refund_kobo, _reason);
    INSERT INTO public.receipts(user_id, order_id, kind, amount_kobo, meta)
      VALUES (_esc.customer_id, _order_id, 'refund', _refund_kobo, jsonb_build_object('escrow_ref', _esc.escrow_ref));
  END IF;

  IF _release_kobo > 0 AND _esc.seller_id IS NOT NULL THEN
    INSERT INTO public.wallets(user_id) VALUES (_esc.seller_id) ON CONFLICT (user_id) DO NOTHING;
    UPDATE public.wallets SET balance_kobo = balance_kobo + _payout, updated_at = now()
      WHERE user_id = _esc.seller_id RETURNING balance_kobo INTO _sbal;
    INSERT INTO public.wallet_transactions(user_id, type, amount_kobo, balance_after_kobo, reference, description, order_id)
      VALUES (_esc.seller_id, 'release', _payout, _sbal, _esc.escrow_ref || '-P', COALESCE(_reason,'Escrow released'), _order_id);
    IF _commission > 0 THEN
      INSERT INTO public.wallet_transactions(user_id, type, amount_kobo, reference, description, order_id)
        VALUES (_esc.seller_id, 'commission', -_commission, _esc.escrow_ref || '-C', 'PadiPlug commission', _order_id);
    END IF;
    INSERT INTO public.receipts(user_id, order_id, kind, amount_kobo, meta)
      VALUES (_esc.seller_id, _order_id, 'payout', _payout, jsonb_build_object('escrow_ref', _esc.escrow_ref, 'commission_kobo', _commission));
  END IF;

  IF _refund_kobo = 0 THEN _new_status := 'released'; _order_status := 'released'; _stage := 'completed';
  ELSIF _release_kobo = 0 THEN _new_status := 'refunded'; _order_status := 'resolved_refund'; _stage := 'refunded';
  ELSE _new_status := 'split'; _order_status := 'resolved_release'; _stage := 'split_settled';
  END IF;

  UPDATE public.escrow_transactions SET status = _new_status, released_kobo = _release_kobo,
    refunded_kobo = _refund_kobo, released_at = now() WHERE id = _esc.id;
  UPDATE public.orders SET status = _order_status::order_status, stage = _stage, completed_at = now() WHERE id = _order_id;
  INSERT INTO public.audit_logs(actor_id, action, entity, entity_id, meta)
    VALUES (_actor_id, 'escrow.settle', 'order', _order_id,
      jsonb_build_object('release_kobo', _release_kobo, 'refund_kobo', _refund_kobo, 'reason', _reason));
  RETURN jsonb_build_object('status', _new_status, 'release_kobo', _release_kobo, 'refund_kobo', _refund_kobo, 'payout_kobo', _payout);
END; $$;
REVOKE ALL ON FUNCTION public.escrow_settle(uuid,bigint,bigint,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.escrow_settle(uuid,bigint,bigint,uuid,text) TO service_role;

-- auto refund overdue orders (seller never delivered before deadline)
CREATE OR REPLACE FUNCTION public.escrow_sweep_overdue()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o record; _n integer := 0;
BEGIN
  FOR _o IN
    SELECT o.id, e.amount_kobo FROM public.orders o
    JOIN public.escrow_transactions e ON e.order_id = o.id AND e.status = 'held'
    WHERE o.status = 'paid_escrow' AND o.delivery_deadline_at IS NOT NULL AND o.delivery_deadline_at < now()
    LIMIT 50
  LOOP
    PERFORM public.escrow_settle(_o.id, 0, _o.amount_kobo, NULL, 'Auto-refund: delivery deadline passed');
    INSERT INTO public.notifications(user_id, title, body, link)
      SELECT customer_id, 'Automatic refund', 'The seller missed the delivery deadline, so your escrow was refunded.', '/orders/' || _o.id
      FROM public.orders WHERE id = _o.id;
    _n := _n + 1;
  END LOOP;
  RETURN _n;
END; $$;
REVOKE ALL ON FUNCTION public.escrow_sweep_overdue() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.escrow_sweep_overdue() TO service_role;

-- backfill escrow rows for existing held orders
INSERT INTO public.escrow_transactions(escrow_ref, order_id, customer_id, seller_id, amount_kobo, commission_kobo)
SELECT 'ESC-' || upper(substr(replace(o.id::text,'-',''),1,10)), o.id, o.customer_id,
       COALESCE(v.owner_id, a.owner_id), o.total_kobo, o.commission_kobo
FROM public.orders o
LEFT JOIN public.vendors v ON v.id = o.vendor_id
LEFT JOIN public.artisans a ON a.id = o.artisan_id
WHERE o.status IN ('paid_escrow','fulfilled','disputed')
ON CONFLICT DO NOTHING;

UPDATE public.orders SET stage = CASE
  WHEN status = 'paid_escrow' THEN 'awaiting_acceptance'
  WHEN status = 'fulfilled' THEN 'waiting_confirmation'
  WHEN status = 'disputed' THEN 'dispute_open'
  WHEN status IN ('released','completed','resolved_release') THEN 'completed'
  WHEN status = 'resolved_refund' THEN 'refunded'
  WHEN status = 'cancelled' THEN 'cancelled'
  ELSE 'awaiting_acceptance' END;