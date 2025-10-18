-- Create invoice_items table
CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for invoice_items
-- Users can view their own invoice items
CREATE POLICY "Users can view their own invoice items"
ON public.invoice_items
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM invoices i
  WHERE i.id = invoice_items.invoice_id
  AND i.user_id = auth.uid()
));

-- Users can insert their own invoice items
CREATE POLICY "Users can insert their own invoice items"
ON public.invoice_items
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM invoices i
  WHERE i.id = invoice_items.invoice_id
  AND i.user_id = auth.uid()
));

-- Users can update their own invoice items
CREATE POLICY "Users can update their own invoice items"
ON public.invoice_items
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM invoices i
  WHERE i.id = invoice_items.invoice_id
  AND i.user_id = auth.uid()
));

-- Users can delete their own invoice items
CREATE POLICY "Users can delete their own invoice items"
ON public.invoice_items
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM invoices i
  WHERE i.id = invoice_items.invoice_id
  AND i.user_id = auth.uid()
));


-- Add foreign key constraint
ALTER TABLE public.invoice_items
ADD CONSTRAINT fk_invoice_items_invoice
FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;

-- Create trigger for updated_at. Assumes set_updated_at() function exists from previous migrations.
CREATE TRIGGER update_invoice_items_updated_at
BEFORE UPDATE ON public.invoice_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();