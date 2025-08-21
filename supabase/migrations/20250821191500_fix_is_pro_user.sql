-- Fix is_pro_user() to reference canonical Stripe tables/view
-- Supports status: active, trialing, and grace for past_due before current_period_end
CREATE OR REPLACE FUNCTION public.is_pro_user(uid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_price_id text;
  v_status text;
  v_cpe timestamptz;
BEGIN
  -- First try user-scoped table if present
  SELECT sus.price_id, lower(coalesce(sus.status, '')) AS status, sus.current_period_end
    INTO v_price_id, v_status, v_cpe
  FROM public.stripe_user_subscriptions sus
  WHERE sus.user_id = uid
  ORDER BY sus.updated_at DESC
  LIMIT 1;

  IF v_status IS NULL THEN
    -- Fallback to the secure view that joins stripe_customers + stripe_subscriptions
    SELECT s.price_id,
           lower(coalesce(s.status::text, '')) as status,
           to_timestamp(NULLIF(s.current_period_end,0))::timestamptz
      INTO v_price_id, v_status, v_cpe
    FROM stripe_customers c
    LEFT JOIN stripe_subscriptions s ON s.customer_id = c.customer_id
    WHERE c.user_id = uid AND c.deleted_at IS NULL AND s.deleted_at IS NULL
    ORDER BY s.updated_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_status IN ('active','trialing') THEN
    RETURN true;
  END IF;

  IF v_status = 'past_due' AND v_cpe IS NOT NULL AND v_cpe > now() THEN
    RETURN true; -- grace period
  END IF;

  RETURN false;
END;
$$;
