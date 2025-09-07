-- Fix the service role policy to be more specific
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON public.subscriptions;

-- Create more specific policies for service operations
CREATE POLICY "Service role can insert subscriptions" 
ON public.subscriptions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service role can update subscriptions" 
ON public.subscriptions 
FOR UPDATE 
USING (true);

-- Fix the webhook user lookup by creating a function to map Stripe customer to user
CREATE OR REPLACE FUNCTION get_user_id_from_stripe_customer(stripe_customer_id text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_uuid uuid;
BEGIN
  -- First try to find via existing subscription records
  SELECT user_id INTO user_uuid 
  FROM stripe_user_subscriptions 
  WHERE stripe_customer_id = $1 
  LIMIT 1;
  
  -- If not found, try to find via Stripe customer email match
  IF user_uuid IS NULL THEN
    SELECT auth.users.id INTO user_uuid
    FROM auth.users
    WHERE auth.users.email = (
      SELECT email 
      FROM stripe_user_subscriptions s
      JOIN auth.users u ON s.user_id = u.id 
      WHERE s.stripe_customer_id = $1
      LIMIT 1
    );
  END IF;
  
  RETURN user_uuid;
END;
$$;