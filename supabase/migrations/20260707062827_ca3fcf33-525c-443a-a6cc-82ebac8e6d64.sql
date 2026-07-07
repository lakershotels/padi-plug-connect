
-- 1. Backfill: grant roles now if the user exists and has a verified email
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, r.role
FROM auth.users u
CROSS JOIN (VALUES ('admin'::public.app_role), ('super_admin'::public.app_role)) AS r(role)
WHERE lower(u.email) = 'meerahluxry@gmail.com'
  AND u.email_confirmed_at IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Trigger function: grant master-admin roles when this specific email is created or verified
CREATE OR REPLACE FUNCTION public.grant_master_admin_for_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL
     AND lower(NEW.email) = 'meerahluxry@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'), (NEW.id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_master ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_master
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_master_admin_for_email();

DROP TRIGGER IF EXISTS on_auth_user_confirmed_grant_master ON auth.users;
CREATE TRIGGER on_auth_user_confirmed_grant_master
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.grant_master_admin_for_email();
