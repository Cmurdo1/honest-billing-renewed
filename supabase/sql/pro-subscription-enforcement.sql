-- HonestInvoice: Pro/Free subscription enforcement (run in Supabase SQL editor)
-- 1) Pro access function: active, trialing, or grace while past_due before current_period_end
CREATE OR REPLACE FUNCTION public.is_pro_user(uid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status text;
  v_cpe timestamptz;
BEGIN
  -- Try user-scoped table first (if your project uses it)
  SELECT lower(coalesce(sus.status, '')) AS status,
         sus.current_period_end
    INTO v_status, v_cpe
  FROM public.stripe_user_subscriptions sus
  WHERE sus.user_id = uid
  ORDER BY sus.updated_at DESC
  LIMIT 1;

  -- Fallback to canonical Stripe tables (customer -> subscription)
  IF v_status IS NULL THEN
    SELECT lower(coalesce(s.status::text, '')) AS status,
           CASE WHEN s.current_period_end IS NULL THEN NULL
                ELSE to_timestamp(s.current_period_end)::timestamptz
           END AS current_period_end
      INTO v_status, v_cpe
    FROM public.stripe_customers c
    LEFT JOIN public.stripe_subscriptions s ON s.customer_id = c.customer_id
    WHERE c.user_id = uid
      AND c.deleted_at IS NULL
      AND s.deleted_at IS NULL
    ORDER BY s.updated_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  -- Determine access
  IF v_status IN ('active','trialing') THEN
    RETURN true;
  END IF;
  IF v_status = 'past_due' AND v_cpe IS NOT NULL AND v_cpe > now() THEN
    RETURN true; -- grace period
  END IF;

  RETURN false;
END;
$$;

-- 2) Free plan: max 5 clients (DB-level)
CREATE OR REPLACE FUNCTION public.enforce_client_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT public.is_pro_user(NEW.user_id) THEN
    SELECT count(*) INTO v_count FROM public.clients WHERE user_id = NEW.user_id;
    IF v_count >= 5 THEN
      RAISE EXCEPTION 'Free plan limit reached: maximum 5 clients. Upgrade to Pro for unlimited clients.' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enforce_client_limit') THEN
    DROP TRIGGER trg_enforce_client_limit ON public.clients;
  END IF;
END$$;

CREATE TRIGGER trg_enforce_client_limit
BEFORE INSERT ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.enforce_client_limit();

-- 3) Pro-only features: enforce for recurring_invoices creation
CREATE OR REPLACE FUNCTION public.enforce_pro_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_pro_user(NEW.user_id) THEN
    RAISE EXCEPTION 'This feature requires a Pro subscription.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enforce_pro_recurring') THEN
    DROP TRIGGER trg_enforce_pro_recurring ON public.recurring_invoices;
  END IF;
END$$;

CREATE TRIGGER trg_enforce_pro_recurring
BEFORE INSERT ON public.recurring_invoices
FOR EACH ROW
EXECUTE FUNCTION public.enforce_pro_only();

-- Optional: extend to BEFORE UPDATE if you want to block enabling/reactivating by Free users
-- CREATE TRIGGER trg_enforce_pro_recurring_upd
-- BEFORE UPDATE ON public.recurring_invoices
-- FOR EACH ROW EXECUTE FUNCTION public.enforce_pro_only();

