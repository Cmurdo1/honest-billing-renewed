# Database Schema Fix Guide

## Problem Summary
The error "column s.customer_id does not exist" occurs because the `stripe_customers` and `stripe_subscriptions` tables are missing essential columns that the application expects.

## Root Cause
The database tables exist but are missing the following critical columns:
- `stripe_customers` table: missing `customer_id`, `user_id` columns
- `stripe_subscriptions` table: missing `customer_id`, `subscription_id`, `status`, and other columns

## Solution

### Step 1: Access Supabase SQL Editor
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to your project: `ezdmasftbvaohoghiflo`
3. Click on "SQL Editor" in the left sidebar

### Step 2: Run the Fix Script
Copy and paste the following SQL script and execute it in the SQL Editor:

```sql
-- ===============================================
-- FIX FOR MISSING STRIPE TABLE COLUMNS
-- ===============================================

-- Step 1: Check current table structure (diagnostic)
SELECT 'Current stripe_customers columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'stripe_customers'
ORDER BY ordinal_position;

SELECT 'Current stripe_subscriptions columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'stripe_subscriptions'
ORDER BY ordinal_position;

-- Step 2: Create required enum types
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stripe_subscription_status') THEN
        CREATE TYPE stripe_subscription_status AS ENUM (
            'not_started', 'incomplete', 'incomplete_expired', 'trialing',
            'active', 'past_due', 'canceled', 'unpaid', 'paused'
        );
    END IF;
END $$;

-- Step 3: Fix stripe_customers table
ALTER TABLE stripe_customers 
ADD COLUMN IF NOT EXISTS customer_id text,
ADD COLUMN IF NOT EXISTS user_id uuid,
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Step 4: Fix stripe_subscriptions table
ALTER TABLE stripe_subscriptions 
ADD COLUMN IF NOT EXISTS customer_id text,
ADD COLUMN IF NOT EXISTS subscription_id text,
ADD COLUMN IF NOT EXISTS price_id text,
ADD COLUMN IF NOT EXISTS current_period_start bigint,
ADD COLUMN IF NOT EXISTS current_period_end bigint,
ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_method_brand text,
ADD COLUMN IF NOT EXISTS payment_method_last4 text,
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Add status column with proper enum type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stripe_subscriptions' AND column_name = 'status'
    ) THEN
        ALTER TABLE stripe_subscriptions ADD COLUMN status stripe_subscription_status DEFAULT 'not_started';
    END IF;
END $$;

-- Step 5: Add constraints
ALTER TABLE stripe_customers 
ADD CONSTRAINT IF NOT EXISTS stripe_customers_customer_id_unique UNIQUE (customer_id),
ADD CONSTRAINT IF NOT EXISTS stripe_customers_user_id_unique UNIQUE (user_id);

ALTER TABLE stripe_subscriptions 
ADD CONSTRAINT IF NOT EXISTS stripe_subscriptions_customer_id_unique UNIQUE (customer_id);

-- Step 6: Add foreign key constraints (optional, may fail if auth.users doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'stripe_customers_user_id_fkey'
    ) THEN
        BEGIN
            ALTER TABLE stripe_customers 
            ADD CONSTRAINT stripe_customers_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES auth.users(id);
        EXCEPTION 
            WHEN OTHERS THEN 
                RAISE NOTICE 'Could not add foreign key constraint to auth.users: %', SQLERRM;
        END;
    END IF;
END $$;

-- Step 7: Enable RLS (Row Level Security)
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies
DO $$
BEGIN
    -- Policy for stripe_customers
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'stripe_customers' 
        AND policyname = 'Users can view their own customer data'
    ) THEN
        CREATE POLICY "Users can view their own customer data"
            ON stripe_customers
            FOR SELECT
            TO authenticated
            USING (user_id = auth.uid() AND deleted_at IS NULL);
    END IF;

    -- Policy for stripe_subscriptions
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

-- Step 9: Create/Update the stripe_user_subscriptions view
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

-- Step 10: Create helper functions
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

-- Step 11: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON stripe_customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON stripe_subscriptions TO authenticated;
GRANT SELECT ON public.stripe_user_subscriptions TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_pro_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_subscription_status(uuid) TO authenticated;

-- Step 12: Create update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_stripe_customers_updated_at ON stripe_customers;
CREATE TRIGGER update_stripe_customers_updated_at
    BEFORE UPDATE ON stripe_customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stripe_subscriptions_updated_at ON stripe_subscriptions;
CREATE TRIGGER update_stripe_subscriptions_updated_at
    BEFORE UPDATE ON stripe_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 13: Verification queries
SELECT 'VERIFICATION - stripe_customers columns after fix:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'stripe_customers'
ORDER BY ordinal_position;

SELECT 'VERIFICATION - stripe_subscriptions columns after fix:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'stripe_subscriptions'
ORDER BY ordinal_position;

-- Test the problematic query
SELECT 'VERIFICATION - Testing stripe_user_subscriptions view:' as info;
SELECT * FROM stripe_user_subscriptions LIMIT 1;

SELECT 'VERIFICATION - Testing is_pro_user function:' as info;
-- Note: This will return false for unauthenticated users, but should not error
```

### Step 3: Verify the Fix

After running the script, you should see:
1. Both tables now have all required columns
2. The verification queries at the end should show the complete column structure
3. No errors about missing columns

### Step 4: Test Your Application

1. Restart your application
2. Test user authentication and subscription-related features
3. The "s.customer_id does not exist" error should be resolved

## What This Fix Does

1. **Adds Missing Columns**: Adds all required columns to both stripe tables
2. **Creates Proper Constraints**: Adds unique constraints and foreign keys
3. **Sets Up RLS**: Enables Row Level Security for data protection
4. **Creates Views and Functions**: Recreates the stripe_user_subscriptions view and helper functions
5. **Adds Triggers**: Sets up automatic timestamp updates

## Next Steps

After running this fix:
1. Monitor your application logs for any remaining database errors
2. Test the subscription functionality thoroughly
3. Consider backing up your database before making further changes

## Troubleshooting

If you still see errors after running this script:
1. Check the verification output at the end of the script
2. Ensure all columns are present in both tables
3. Verify that the view and functions were created successfully
4. Check your application's database connection configuration