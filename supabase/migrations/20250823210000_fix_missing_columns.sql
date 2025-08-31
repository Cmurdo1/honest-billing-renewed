-- Emergency fix for missing columns in stripe tables
-- This addresses the "s.customer_id does not exist" error

-- First, check if columns exist and add them if missing
DO $$
BEGIN
    -- Add customer_id column to stripe_customers if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stripe_customers' 
        AND column_name = 'customer_id'
    ) THEN
        ALTER TABLE stripe_customers ADD COLUMN customer_id text;
        ALTER TABLE stripe_customers ADD CONSTRAINT stripe_customers_customer_id_unique UNIQUE (customer_id);
    END IF;

    -- Add user_id column to stripe_customers if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stripe_customers' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE stripe_customers ADD COLUMN user_id uuid;
        ALTER TABLE stripe_customers ADD CONSTRAINT stripe_customers_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES auth.users(id);
        ALTER TABLE stripe_customers ADD CONSTRAINT stripe_customers_user_id_unique UNIQUE (user_id);
    END IF;

    -- Add customer_id column to stripe_subscriptions if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stripe_subscriptions' 
        AND column_name = 'customer_id'
    ) THEN
        ALTER TABLE stripe_subscriptions ADD COLUMN customer_id text;
        ALTER TABLE stripe_subscriptions ADD CONSTRAINT stripe_subscriptions_customer_id_unique UNIQUE (customer_id);
    END IF;

    -- Add other essential columns to stripe_customers if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stripe_customers' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE stripe_customers ADD COLUMN created_at timestamp with time zone DEFAULT now();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stripe_customers' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE stripe_customers ADD COLUMN updated_at timestamp with time zone DEFAULT now();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stripe_customers' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE stripe_customers ADD COLUMN deleted_at timestamp with time zone DEFAULT null;
    END IF;

    -- Add other essential columns to stripe_subscriptions if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stripe_subscriptions' 
        AND column_name = 'subscription_id'
    ) THEN
        ALTER TABLE stripe_subscriptions ADD COLUMN subscription_id text;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stripe_subscriptions' 
        AND column_name = 'price_id'
    ) THEN
        ALTER TABLE stripe_subscriptions ADD COLUMN price_id text;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stripe_subscriptions' 
        AND column_name = 'status'
    ) THEN
        -- Create enum if it doesn't exist
        DO $enum$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stripe_subscription_status') THEN
                CREATE TYPE stripe_subscription_status AS ENUM (
                    'not_started', 'incomplete', 'incomplete_expired', 'trialing',
                    'active', 'past_due', 'canceled', 'unpaid', 'paused'
                );
            END IF;
        END $enum$;
        
        ALTER TABLE stripe_subscriptions ADD COLUMN status stripe_subscription_status NOT NULL DEFAULT 'not_started';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stripe_subscriptions' 
        AND column_name = 'current_period_start'
    ) THEN
        ALTER TABLE stripe_subscriptions ADD COLUMN current_period_start bigint;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stripe_subscriptions' 
        AND column_name = 'current_period_end'
    ) THEN
        ALTER TABLE stripe_subscriptions ADD COLUMN current_period_end bigint;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stripe_subscriptions' 
        AND column_name = 'cancel_at_period_end'
    ) THEN
        ALTER TABLE stripe_subscriptions ADD COLUMN cancel_at_period_end boolean DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stripe_subscriptions' 
        AND column_name = 'payment_method_brand'
    ) THEN
        ALTER TABLE stripe_subscriptions ADD COLUMN payment_method_brand text;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stripe_subscriptions' 
        AND column_name = 'payment_method_last4'
    ) THEN
        ALTER TABLE stripe_subscriptions ADD COLUMN payment_method_last4 text;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stripe_subscriptions' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE stripe_subscriptions ADD COLUMN created_at timestamp with time zone DEFAULT now();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stripe_subscriptions' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE stripe_subscriptions ADD COLUMN updated_at timestamp with time zone DEFAULT now();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stripe_subscriptions' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE stripe_subscriptions ADD COLUMN deleted_at timestamp with time zone DEFAULT null;
    END IF;
END $$;

-- Fix the stripe_user_subscriptions view to ensure it works
CREATE OR REPLACE VIEW public.stripe_user_subscriptions
WITH (security_invoker = true) AS
SELECT
  u.id AS id,
  c.user_id,
  c.customer_id AS stripe_customer_id,
  s.subscription_id AS stripe_subscription_id,
  COALESCE(s.status::text, 'none') AS status,
  s.price_id,
  CASE WHEN s.current_period_start IS NULL THEN NULL 
       ELSE to_timestamp(s.current_period_start)::timestamptz END AS current_period_start,
  CASE WHEN s.current_period_end IS NULL THEN NULL 
       ELSE to_timestamp(s.current_period_end)::timestamptz END AS current_period_end,
  s.created_at,
  s.updated_at
FROM public.stripe_customers c
JOIN auth.users u ON u.id = c.user_id
LEFT JOIN public.stripe_subscriptions s ON s.customer_id = c.customer_id
WHERE c.deleted_at IS NULL AND (s.deleted_at IS NULL OR s.deleted_at IS NOT NULL);

-- Create the is_pro_user function
CREATE OR REPLACE FUNCTION public.is_pro_user(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_active_subscription boolean := false;
BEGIN
  -- Check if user has an active Stripe subscription
  SELECT EXISTS(
    SELECT 1 
    FROM public.stripe_customers c
    JOIN public.stripe_subscriptions s ON s.customer_id = c.customer_id
    WHERE c.user_id = user_uuid 
      AND c.deleted_at IS NULL
      AND s.deleted_at IS NULL
      AND s.status IN ('active', 'trialing')
  ) INTO has_active_subscription;
  
  RETURN has_active_subscription;
END;
$$;

-- Create the get_user_subscription_status function
CREATE OR REPLACE FUNCTION public.get_user_subscription_status(user_uuid uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  subscription_status text := 'none';
BEGIN
  SELECT COALESCE(s.status::text, 'none')
  FROM public.stripe_customers c
  LEFT JOIN public.stripe_subscriptions s ON s.customer_id = c.customer_id
  WHERE c.user_id = user_uuid 
    AND c.deleted_at IS NULL
    AND (s.deleted_at IS NULL OR s.deleted_at IS NOT NULL)
  ORDER BY s.created_at DESC
  LIMIT 1
  INTO subscription_status;
  
  RETURN subscription_status;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.is_pro_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_subscription_status(uuid) TO authenticated;
GRANT SELECT ON public.stripe_user_subscriptions TO authenticated;