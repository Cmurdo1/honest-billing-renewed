-- First, disable the problematic trigger temporarily
DROP TRIGGER IF EXISTS subscription_webhook_trigger ON public.stripe_user_subscriptions;

-- Update the webhook function to handle the invalid URL
CREATE OR REPLACE FUNCTION public.notify_subscription_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $function$
BEGIN
    -- Skip webhook for now since URL is not configured
    -- This prevents the error when updating subscriptions
    
    -- For INSERT/UPDATE we must return the new row; for DELETE return OLD (or NULL)
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$function$;

-- Set the user account to Pro status
INSERT INTO public.stripe_user_subscriptions (user_id, status, price_id, current_period_start, current_period_end, updated_at)
SELECT 
  id, 
  'active'::text, 
  'pro_tier'::text,
  now(),
  now() + interval '1 year',
  now()
FROM auth.users 
WHERE email = 'murdochcpm_08@yahoo.com'
AND NOT EXISTS (
  SELECT 1 FROM public.stripe_user_subscriptions 
  WHERE user_id = auth.users.id
);

-- If user already exists, update their status to Pro
UPDATE public.stripe_user_subscriptions 
SET 
  status = 'active',
  price_id = 'pro_tier',
  current_period_start = now(),
  current_period_end = now() + interval '1 year',
  updated_at = now()
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'murdochcpm_08@yahoo.com'
);