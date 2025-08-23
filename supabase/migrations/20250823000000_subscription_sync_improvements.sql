-- Subscription Sync Improvements Migration
-- Adds functions to ensure customer mapping consistency and webhook reliability

-- Function to ensure customer-user mapping exists
CREATE OR REPLACE FUNCTION public.ensure_customer_mapping(
  p_customer_id text,
  p_user_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists boolean := false;
  v_user_id uuid;
BEGIN
  -- Check if mapping already exists
  SELECT EXISTS(
    SELECT 1 FROM stripe_customers 
    WHERE customer_id = p_customer_id 
    AND deleted_at IS NULL
  ) INTO v_exists;
  
  IF v_exists THEN
    RETURN true;
  END IF;
  
  -- If user_id not provided, we can't create mapping
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Create the mapping
  INSERT INTO stripe_customers (user_id, customer_id)
  VALUES (p_user_id, p_customer_id)
  ON CONFLICT (customer_id) DO NOTHING;
  
  RETURN true;
END;
$$;

-- Function to invalidate subscription cache (placeholder for future cache implementation)
CREATE OR REPLACE FUNCTION public.invalidate_subscription_cache(p_customer_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update timestamp to trigger cache invalidation
  UPDATE stripe_subscriptions 
  SET updated_at = now() 
  WHERE customer_id = p_customer_id;
  
  -- Log cache invalidation
  RAISE NOTICE 'Cache invalidated for customer: %', p_customer_id;
END;
$$;

-- Function to validate subscription data consistency
CREATE OR REPLACE FUNCTION public.validate_subscription_data(p_customer_id text)
RETURNS TABLE (
  has_customer_mapping boolean,
  has_subscription_data boolean,
  subscription_status text,
  issues text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer_exists boolean := false;
  v_subscription_exists boolean := false;
  v_status text;
  v_issues text[] := '{}';
BEGIN
  -- Check customer mapping
  SELECT EXISTS(
    SELECT 1 FROM stripe_customers 
    WHERE customer_id = p_customer_id 
    AND deleted_at IS NULL
  ) INTO v_customer_exists;
  
  -- Check subscription data
  SELECT 
    EXISTS(SELECT 1 FROM stripe_subscriptions WHERE customer_id = p_customer_id AND deleted_at IS NULL),
    s.status::text
  INTO v_subscription_exists, v_status
  FROM stripe_subscriptions s
  WHERE s.customer_id = p_customer_id 
  AND s.deleted_at IS NULL;
  
  -- Collect issues
  IF NOT v_customer_exists THEN
    v_issues := array_append(v_issues, 'Missing customer mapping');
  END IF;
  
  IF NOT v_subscription_exists THEN
    v_issues := array_append(v_issues, 'Missing subscription data');
  END IF;
  
  IF v_status IS NULL OR v_status = '' THEN
    v_issues := array_append(v_issues, 'Invalid subscription status');
  END IF;
  
  RETURN QUERY SELECT 
    v_customer_exists,
    v_subscription_exists,
    v_status,
    v_issues;
END;
$$;

-- Add trigger to update updated_at timestamp on stripe_subscriptions
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

-- Create similar trigger for stripe_customers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_stripe_customers_updated_at'
  ) THEN
    CREATE TRIGGER update_stripe_customers_updated_at
      BEFORE UPDATE ON stripe_customers
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;

-- Create index for better performance if not exists
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stripe_subscriptions_customer_id_status 
ON stripe_subscriptions(customer_id, status) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stripe_customers_user_id_customer_id 
ON stripe_customers(user_id, customer_id) 
WHERE deleted_at IS NULL;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION ensure_customer_mapping(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION invalidate_subscription_cache(text) TO service_role;
GRANT EXECUTE ON FUNCTION validate_subscription_data(text) TO service_role;