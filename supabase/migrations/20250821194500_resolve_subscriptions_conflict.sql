-- Resolve stripe_user_subscriptions naming conflict
-- Goal: rely on secure view; remove user-scoped table if present to avoid ambiguity

-- 1) Drop user-scoped table if it exists and not needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'stripe_user_subscriptions'
  ) THEN
    -- If it was a table, drop it to free the name for the view
    EXECUTE 'DROP TABLE public.stripe_user_subscriptions';
  END IF;
END$$;

-- 2) (Re)create secure view named stripe_user_subscriptions (if you prefer the view approach)
-- Adjust columns to match what the app expects (status, price_id, current_period_end)
CREATE OR REPLACE VIEW public.stripe_user_subscriptions
WITH (security_invoker = true) AS
SELECT
  u.id AS id,
  c.user_id,
  c.customer_id AS stripe_customer_id,
  s.subscription_id AS stripe_subscription_id,
  s.status::text AS status,
  s.price_id,
  -- convert epoch seconds to timestamptz
  CASE WHEN s.current_period_start IS NULL THEN NULL ELSE to_timestamp(s.current_period_start)::timestamptz END AS current_period_start,
  CASE WHEN s.current_period_end   IS NULL THEN NULL ELSE to_timestamp(s.current_period_end)::timestamptz   END AS current_period_end,
  s.created_at,
  s.updated_at
FROM public.stripe_customers c
JOIN auth.users u ON u.id = c.user_id
LEFT JOIN public.stripe_subscriptions s ON s.customer_id = c.customer_id
WHERE c.deleted_at IS NULL AND s.deleted_at IS NULL;

GRANT SELECT ON public.stripe_user_subscriptions TO authenticated;

