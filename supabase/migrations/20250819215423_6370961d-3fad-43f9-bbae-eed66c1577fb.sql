-- Create recurring invoices table for Pro users
CREATE TYPE recurring_frequency AS ENUM ('weekly', 'monthly', 'quarterly', 'annually');

CREATE TABLE public.recurring_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID NOT NULL,
  template_number TEXT NOT NULL,
  frequency recurring_frequency NOT NULL DEFAULT 'monthly',
  next_due_date DATE NOT NULL,
  last_generated_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Invoice template data
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create recurring invoice items table
CREATE TABLE public.recurring_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_invoice_id UUID NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC,
  position INTEGER NOT NULL DEFAULT 1,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recurring_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_invoice_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for recurring_invoices
CREATE POLICY "Users can view their own recurring invoices" 
ON public.recurring_invoices 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recurring invoices" 
ON public.recurring_invoices 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring invoices" 
ON public.recurring_invoices 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring invoices" 
ON public.recurring_invoices 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for recurring_invoice_items
CREATE POLICY "Users can view their own recurring invoice items" 
ON public.recurring_invoice_items 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM recurring_invoices ri 
  WHERE ri.id = recurring_invoice_items.recurring_invoice_id 
  AND ri.user_id = auth.uid()
));

CREATE POLICY "Users can insert their own recurring invoice items" 
ON public.recurring_invoice_items 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM recurring_invoices ri 
  WHERE ri.id = recurring_invoice_items.recurring_invoice_id 
  AND ri.user_id = auth.uid()
));

CREATE POLICY "Users can update their own recurring invoice items" 
ON public.recurring_invoice_items 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM recurring_invoices ri 
  WHERE ri.id = recurring_invoice_items.recurring_invoice_id 
  AND ri.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own recurring invoice items" 
ON public.recurring_invoice_items 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM recurring_invoices ri 
  WHERE ri.id = recurring_invoice_items.recurring_invoice_id 
  AND ri.user_id = auth.uid()
));

-- Add foreign key constraints
ALTER TABLE recurring_invoices 
ADD CONSTRAINT fk_recurring_invoices_client 
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

ALTER TABLE recurring_invoice_items 
ADD CONSTRAINT fk_recurring_invoice_items_recurring_invoice 
FOREIGN KEY (recurring_invoice_id) REFERENCES recurring_invoices(id) ON DELETE CASCADE;

-- Create triggers for updated_at
CREATE TRIGGER update_recurring_invoices_updated_at 
BEFORE UPDATE ON recurring_invoices 
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER update_recurring_invoice_items_updated_at 
BEFORE UPDATE ON recurring_invoice_items 
FOR EACH ROW EXECUTE FUNCTION set_updated_at();