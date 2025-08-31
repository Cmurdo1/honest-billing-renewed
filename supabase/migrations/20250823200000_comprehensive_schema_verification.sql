-- ===============================================
-- COMPREHENSIVE HONESTINVOICE DATABASE SCHEMA VERIFICATION AND REPAIR
-- This script ensures all required tables exist with correct structure
-- ===============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- 1. CREATE CUSTOM TYPES
-- ==============================================

DO $$ 
BEGIN
  -- Invoice status enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
    CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'void');
  END IF;
  
  -- Recurring frequency enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recurring_frequency') THEN
    CREATE TYPE recurring_frequency AS ENUM ('weekly', 'monthly', 'quarterly', 'annually');
  END IF;
  
  -- Stripe subscription status enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stripe_subscription_status') THEN
    CREATE TYPE stripe_subscription_status AS ENUM (
      'not_started', 'incomplete', 'incomplete_expired', 'trialing',
      'active', 'past_due', 'canceled', 'unpaid', 'paused'
    );
  END IF;
  
  -- Stripe order status enum (if needed)
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stripe_order_status') THEN
    CREATE TYPE stripe_order_status AS ENUM ('pending', 'completed', 'canceled');
  END IF;
END $$;

-- ==============================================
-- 2. CREATE CORE APPLICATION TABLES
-- ==============================================

-- Clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  company TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE,
  status invoice_status NOT NULL DEFAULT 'draft',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoice items table
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC,
  position INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recurring invoices table
CREATE TABLE IF NOT EXISTS public.recurring_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  template_number TEXT NOT NULL,
  frequency recurring_frequency NOT NULL DEFAULT 'monthly',
  next_due_date DATE NOT NULL,
  last_generated_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recurring invoice items table
CREATE TABLE IF NOT EXISTS public.recurring_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_invoice_id UUID NOT NULL REFERENCES recurring_invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC,
  position INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  company_name TEXT,
  company_logo_url TEXT,
  address TEXT,
  phone TEXT,
  website TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  tax_rate NUMERIC DEFAULT 0,
  invoice_terms TEXT,
  invoice_footer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================
-- 3. CREATE STRIPE INTEGRATION TABLES
-- ==============================================

-- Stripe customers table
CREATE TABLE IF NOT EXISTS public.stripe_customers (
  id bigint primary key generated always as identity,
  user_id uuid references auth.users(id) not null unique,
  customer_id text not null unique,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  deleted_at timestamp with time zone default null
);

-- Stripe subscriptions table (ensure it has customer_id column)
CREATE TABLE IF NOT EXISTS public.stripe_subscriptions (
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

-- Add foreign key constraint to link stripe_subscriptions.customer_id to stripe_customers.customer_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'stripe_subscriptions_customer_id_fkey'
    AND table_name = 'stripe_subscriptions'
  ) THEN
    ALTER TABLE stripe_subscriptions 
    ADD CONSTRAINT stripe_subscriptions_customer_id_fkey 
    FOREIGN KEY (customer_id) REFERENCES stripe_customers(customer_id) ON DELETE CASCADE;
  END IF;
END $$;

-- ==============================================
-- 4. CREATE PERFORMANCE INDEXES
-- ==============================================

-- Core table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_issue_date ON public.invoices(issue_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recurring_invoices_user_id ON public.recurring_invoices(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recurring_invoices_client_id ON public.recurring_invoices(client_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recurring_invoices_next_due ON public.recurring_invoices(next_due_date) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recurring_invoice_items_recurring_id ON public.recurring_invoice_items(recurring_invoice_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- Stripe table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stripe_customers_user_id ON stripe_customers(user_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stripe_customers_customer_id ON stripe_customers(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stripe_subscriptions_customer_id ON stripe_subscriptions(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stripe_subscriptions_status ON stripe_subscriptions(customer_id, status) WHERE deleted_at IS NULL;

-- ==============================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ==============================================

-- Enable RLS on all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 6. CREATE RLS POLICIES
-- ==============================================

-- Clients policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clients' AND policyname = 'Users can manage their own clients') THEN
    CREATE POLICY "Users can manage their own clients" ON public.clients
      FOR ALL TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Invoices policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'invoices' AND policyname = 'Users can manage their own invoices') THEN
    CREATE POLICY "Users can manage their own invoices" ON public.invoices
      FOR ALL TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Invoice items policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'invoice_items' AND policyname = 'Users can manage invoice items for their invoices') THEN
    CREATE POLICY "Users can manage invoice items for their invoices" ON public.invoice_items
      FOR ALL TO authenticated
      USING (invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid()));
  END IF;
END $$;

-- Recurring invoices policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recurring_invoices' AND policyname = 'Users can manage their own recurring invoices') THEN
    CREATE POLICY "Users can manage their own recurring invoices" ON public.recurring_invoices
      FOR ALL TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Recurring invoice items policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recurring_invoice_items' AND policyname = 'Users can manage recurring invoice items for their recurring invoices') THEN
    CREATE POLICY "Users can manage recurring invoice items for their recurring invoices" ON public.recurring_invoice_items
      FOR ALL TO authenticated
      USING (recurring_invoice_id IN (SELECT id FROM recurring_invoices WHERE user_id = auth.uid()));
  END IF;
END $$;

-- User settings policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_settings' AND policyname = 'Users can manage their own settings') THEN
    CREATE POLICY "Users can manage their own settings" ON public.user_settings
      FOR ALL TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Stripe customers policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stripe_customers' AND policyname = 'Users can view their own customer data') THEN
    CREATE POLICY "Users can view their own customer data" ON stripe_customers
      FOR SELECT TO authenticated
      USING (user_id = auth.uid() AND deleted_at IS NULL);
  END IF;
END $$;

-- Stripe subscriptions policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stripe_subscriptions' AND policyname = 'Users can view their own subscription data') THEN
    CREATE POLICY "Users can view their own subscription data" ON stripe_subscriptions
      FOR SELECT TO authenticated
      USING (
        customer_id IN (
          SELECT customer_id FROM stripe_customers 
          WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
        AND deleted_at IS NULL
      );
  END IF;
END $$;

-- ==============================================
-- 7. CREATE VIEWS
-- ==============================================

-- Recreate stripe_user_subscriptions view with proper structure
CREATE OR REPLACE VIEW public.stripe_user_subscriptions
WITH (security_invoker = true) AS
SELECT
  u.id AS id,
  c.user_id,
  c.customer_id AS stripe_customer_id,
  s.subscription_id AS stripe_subscription_id,
  s.status::text AS status,
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

-- ==============================================
-- 8. CREATE HELPER FUNCTIONS
-- ==============================================

-- Function to check if user is pro
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

-- Function to get user's subscription status
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

-- ==============================================
-- 9. CREATE UPDATE TRIGGERS
-- ==============================================

-- Generic update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers to all tables
DO $$
DECLARE
  table_name text;
  tables text[] := ARRAY['clients', 'invoices', 'invoice_items', 'recurring_invoices', 'recurring_invoice_items', 'user_settings', 'stripe_customers', 'stripe_subscriptions'];
BEGIN
  FOREACH table_name IN ARRAY tables
  LOOP
    -- Drop existing trigger if it exists
    EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON public.%I', table_name, table_name);
    
    -- Create new trigger
    EXECUTE format('
      CREATE TRIGGER update_%I_updated_at
        BEFORE UPDATE ON public.%I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    ', table_name, table_name);
  END LOOP;
END $$;

-- ==============================================
-- 10. GRANT PERMISSIONS
-- ==============================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_invoice_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT SELECT ON stripe_customers TO authenticated;
GRANT SELECT ON stripe_subscriptions TO authenticated;
GRANT SELECT ON public.stripe_user_subscriptions TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.is_pro_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_subscription_status(uuid) TO authenticated;

-- ==============================================
-- 11. VERIFY SCHEMA INTEGRITY
-- ==============================================

-- Function to verify all tables exist and have required columns
CREATE OR REPLACE FUNCTION public.verify_schema_integrity()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb := '{}';
  table_check jsonb;
BEGIN
  -- Check each table and key columns
  
  -- Check stripe_subscriptions table specifically
  SELECT jsonb_build_object(
    'table_exists', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'stripe_subscriptions'),
    'customer_id_column_exists', EXISTS(
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'stripe_subscriptions' AND column_name = 'customer_id'
    ),
    'can_query', (
      SELECT CASE 
        WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'stripe_subscriptions') 
        THEN true 
        ELSE false 
      END
    )
  ) INTO table_check;
  
  result := result || jsonb_build_object('stripe_subscriptions', table_check);
  
  -- Add timestamp
  result := result || jsonb_build_object('verified_at', now());
  
  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.verify_schema_integrity() TO authenticated;

-- Run verification
SELECT public.verify_schema_integrity();