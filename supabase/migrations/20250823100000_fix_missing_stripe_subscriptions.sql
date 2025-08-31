-- Fix Missing stripe_subscriptions Table
-- This migration ensures the stripe_subscriptions table exists with proper structure

-- First, create the enum type if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stripe_subscription_status') THEN
        CREATE TYPE stripe_subscription_status AS ENUM (
            'not_started',
            'incomplete',
            'incomplete_expired',
            'trialing',
            'active',
            'past_due',
            'canceled',
            'unpaid',
            'paused'
        );
    END IF;
END $$;

-- Create stripe_subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id bigint primary key generated always as identity,
  customer_id text unique not null,
  subscription_id text default null,
  price_id text default null,
  current_period_start bigint default null,
  current_period_end bigint default null,
  cancel_at_period_end boolean default false,
  payment_method_brand text default null,
  payment_method_last4 text default null,
  status stripe_subscription_status not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  deleted_at timestamp with time zone default null
);

-- Enable RLS
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'stripe_subscriptions' 
        AND policyname = 'Users can view their own subscription data'
    ) THEN
        CREATE POLICY "Users can view their own subscription data"
            ON stripe_subscriptions
            FOR SELECT
            TO authenticated
            USING (
                customer_id IN (
                    SELECT customer_id
                    FROM stripe_customers
                    WHERE user_id = auth.uid() AND deleted_at IS NULL
                )
                AND deleted_at IS NULL
            );
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stripe_subscriptions_customer_id_status 
ON stripe_subscriptions(customer_id, status) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stripe_subscriptions_subscription_id 
ON stripe_subscriptions(subscription_id) 
WHERE deleted_at IS NULL;

-- Create update trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_stripe_subscriptions_updated_at'
  ) THEN
    CREATE TRIGGER update_stripe_subscriptions_updated_at
      BEFORE UPDATE ON stripe_subscriptions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;

-- Recreate the stripe_user_subscriptions view to ensure it works with the new table
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
WHERE c.deleted_at IS NULL AND (s.deleted_at IS NULL OR s.deleted_at IS NOT NULL);

-- Grant permissions
GRANT SELECT ON public.stripe_user_subscriptions TO authenticated;
GRANT SELECT ON stripe_subscriptions TO authenticated;

-- Create function to verify table exists and is accessible
CREATE OR REPLACE FUNCTION public.verify_stripe_subscriptions_table()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  table_exists boolean := false;
  can_query boolean := false;
BEGIN
  -- Check if table exists
  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'stripe_subscriptions'
  ) INTO table_exists;
  
  -- Try to query the table
  IF table_exists THEN
    BEGIN
      PERFORM 1 FROM stripe_subscriptions LIMIT 1;
      can_query := true;
    EXCEPTION WHEN OTHERS THEN
      can_query := false;
    END;
  END IF;
  
  RETURN table_exists AND can_query;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION verify_stripe_subscriptions_table() TO authenticated;