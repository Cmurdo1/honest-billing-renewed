-- Fix the problematic column name in recurring_invoices table
ALTER TABLE public.recurring_invoices RENAME COLUMN "s.customer_id" TO user_id;

-- Drop the problematic tables 's' and 's.customer_id'
DROP TABLE IF EXISTS public.s CASCADE;
DROP TABLE IF EXISTS "public"."s.customer_id" CASCADE;

-- Update RLS policies for recurring_invoices to use the correct column name
DROP POLICY IF EXISTS "Users can delete their own recurring invoices" ON public.recurring_invoices;
DROP POLICY IF EXISTS "Users can insert their own recurring invoices" ON public.recurring_invoices;
DROP POLICY IF EXISTS "Users can update their own recurring invoices" ON public.recurring_invoices;
DROP POLICY IF EXISTS "Users can view their own recurring invoices" ON public.recurring_invoices;

-- Recreate RLS policies with correct column reference
CREATE POLICY "Users can view their own recurring invoices" ON public.recurring_invoices
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recurring invoices" ON public.recurring_invoices
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring invoices" ON public.recurring_invoices
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring invoices" ON public.recurring_invoices
FOR DELETE USING (auth.uid() = user_id);

-- Update RLS policies for recurring_invoice_items to use correct table reference
DROP POLICY IF EXISTS "Users can delete their own recurring invoice items" ON public.recurring_invoice_items;
DROP POLICY IF EXISTS "Users can insert their own recurring invoice items" ON public.recurring_invoice_items;
DROP POLICY IF EXISTS "Users can update their own recurring invoice items" ON public.recurring_invoice_items;
DROP POLICY IF EXISTS "Users can view their own recurring invoice items" ON public.recurring_invoice_items;

-- Recreate RLS policies for recurring_invoice_items with correct reference
CREATE POLICY "Users can view their own recurring invoice items" ON public.recurring_invoice_items
FOR SELECT USING (EXISTS (
  SELECT 1 FROM recurring_invoices ri 
  WHERE ri.id = recurring_invoice_items.recurring_invoice_id 
  AND ri.user_id = auth.uid()
));

CREATE POLICY "Users can insert their own recurring invoice items" ON public.recurring_invoice_items
FOR INSERT WITH CHECK (EXISTS (
  SELECT 1 FROM recurring_invoices ri 
  WHERE ri.id = recurring_invoice_items.recurring_invoice_id 
  AND ri.user_id = auth.uid()
));

CREATE POLICY "Users can update their own recurring invoice items" ON public.recurring_invoice_items
FOR UPDATE USING (EXISTS (
  SELECT 1 FROM recurring_invoices ri 
  WHERE ri.id = recurring_invoice_items.recurring_invoice_id 
  AND ri.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own recurring invoice items" ON public.recurring_invoice_items
FOR DELETE USING (EXISTS (
  SELECT 1 FROM recurring_invoices ri 
  WHERE ri.id = recurring_invoice_items.recurring_invoice_id 
  AND ri.user_id = auth.uid()
));

-- Set user to Pro status
INSERT INTO public.stripe_user_subscriptions (user_id, status, price_id)
SELECT id, 'active', 'pro_tier'
FROM auth.users 
WHERE email = 'murdochcpm_08@yahoo.com'
ON CONFLICT (user_id) DO UPDATE SET 
  status = 'active',
  price_id = 'pro_tier',
  current_period_start = now(),
  current_period_end = now() + interval '1 year',
  updated_at = now();