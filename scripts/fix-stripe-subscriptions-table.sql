-- QUICK FIX: Run this SQL in your Supabase SQL Editor
-- Go to: https://supabase.com/dashboard/project/ezdmasftbvaohoghiflo/sql/new

-- Step 1: Create enum type (safe to run multiple times)
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

-- Step 2: Create stripe_subscriptions table
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

-- Step 3: Enable RLS
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policy
DROP POLICY IF EXISTS "Users can view their own subscription data" ON stripe_subscriptions;
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

-- Step 5: Create indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stripe_subscriptions_customer_id_status 
ON stripe_subscriptions(customer_id, status) 
WHERE deleted_at IS NULL;

-- Step 6: Create update trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_stripe_subscriptions_updated_at ON stripe_subscriptions;
CREATE TRIGGER update_stripe_subscriptions_updated_at
    BEFORE UPDATE ON stripe_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 7: Grant permissions
GRANT SELECT ON stripe_subscriptions TO authenticated;

-- Step 8: Test the fix
SELECT 
    'stripe_subscriptions table created successfully!' as status,
    COUNT(*) as record_count 
FROM stripe_subscriptions;