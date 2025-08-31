-- Migration: Ensure customer_id columns exist on stripe_customers and stripe_subscriptions
-- Created: 2025-08-30
-- This migration is defensive and idempotent: it will only add missing columns/constraints/indexes.

BEGIN;

-- Add customer_id to stripe_customers if missing
ALTER TABLE IF EXISTS public.stripe_customers
  ADD COLUMN IF NOT EXISTS customer_id text;

-- Ensure a unique constraint / index on stripe_customers.customer_id for quick lookups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = 'idx_stripe_customers_customer_id' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stripe_customers_customer_id ON public.stripe_customers(customer_id) WHERE deleted_at IS NULL;
  END IF;
END$$;

-- Add customer_id to stripe_subscriptions if missing
ALTER TABLE IF EXISTS public.stripe_subscriptions
  ADD COLUMN IF NOT EXISTS customer_id text;

-- Ensure an index on stripe_subscriptions.customer_id for joins/filters
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = 'idx_stripe_subscriptions_customer_id' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stripe_subscriptions_customer_id ON public.stripe_subscriptions(customer_id) WHERE deleted_at IS NULL;
  END IF;
END$$;

-- Add unique constraints if missing (allow nulls but enforce uniqueness for non-null customer_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.constraint_name = 'stripe_customers_customer_id_unique' AND tc.table_name = 'stripe_customers'
  ) THEN
    BEGIN
      ALTER TABLE public.stripe_customers ADD CONSTRAINT stripe_customers_customer_id_unique UNIQUE (customer_id);
    EXCEPTION WHEN duplicate_object THEN
      -- ignore if concurrently created
      NULL;
    END;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.constraint_name = 'stripe_subscriptions_customer_id_unique' AND tc.table_name = 'stripe_subscriptions'
  ) THEN
    BEGIN
      ALTER TABLE public.stripe_subscriptions ADD CONSTRAINT stripe_subscriptions_customer_id_unique UNIQUE (customer_id);
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END$$;

-- Optional: add a foreign key from stripe_subscriptions.customer_id -> stripe_customers.customer_id if both columns exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stripe_subscriptions' AND column_name='customer_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stripe_customers' AND column_name='customer_id') THEN

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'stripe_subscriptions' AND kcu.column_name = 'customer_id'
    ) THEN
      BEGIN
        ALTER TABLE public.stripe_subscriptions
          ADD CONSTRAINT stripe_subscriptions_customer_id_fkey
          FOREIGN KEY (customer_id) REFERENCES public.stripe_customers(customer_id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN
        NULL;
      END;
    END IF;
  END IF;
END$$;

COMMIT;

-- Notes:
-- - Apply this migration using your normal Supabase migration process or run it in the SQL editor.
-- - If your deployment enforces strict schema via other migrations, review those before applying to avoid conflicts.
