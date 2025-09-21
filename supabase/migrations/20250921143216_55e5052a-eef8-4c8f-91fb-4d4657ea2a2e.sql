-- Create quotes table
CREATE TABLE public.quotes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  client_id uuid NOT NULL,
  quote_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  subtotal numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  notes text,
  issue_date date NOT NULL DEFAULT (timezone('utc', now()))::date,
  expiry_date date,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
);

-- Create quote_items table
CREATE TABLE public.quote_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id uuid NOT NULL,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  amount numeric,
  position integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
);

-- Create time_entries table
CREATE TABLE public.time_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  client_id uuid,
  project_name text,
  description text NOT NULL,
  hours_worked numeric NOT NULL,
  hourly_rate numeric NOT NULL DEFAULT 0,
  total_amount numeric,
  date date NOT NULL DEFAULT (timezone('utc', now()))::date,
  is_billable boolean NOT NULL DEFAULT true,
  is_invoiced boolean NOT NULL DEFAULT false,
  invoice_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
);

-- Create expenses table
CREATE TABLE public.expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  client_id uuid,
  description text NOT NULL,
  amount numeric NOT NULL,
  date date NOT NULL DEFAULT (timezone('utc', now()))::date,
  category text,
  is_billable boolean NOT NULL DEFAULT false,
  is_invoiced boolean NOT NULL DEFAULT false,
  invoice_id uuid,
  receipt_url text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
);

-- Create payment_reminders table
CREATE TABLE public.payment_reminders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL,
  user_id uuid NOT NULL,
  reminder_type text NOT NULL,
  days_overdue integer NOT NULL DEFAULT 0,
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
);

-- Create customer_users table for customer portal
CREATE TABLE public.customer_users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL,
  user_id uuid, -- References auth.users for customer login
  email text NOT NULL,
  password_hash text,
  is_active boolean NOT NULL DEFAULT true,
  last_login timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE(client_id, email)
);

-- Enable RLS on all tables
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for quotes
CREATE POLICY "Users can view their own quotes" ON public.quotes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own quotes" ON public.quotes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own quotes" ON public.quotes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own quotes" ON public.quotes FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for quote_items
CREATE POLICY "Users can view their own quote items" ON public.quote_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_items.quote_id AND q.user_id = auth.uid())
);
CREATE POLICY "Users can insert their own quote items" ON public.quote_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_items.quote_id AND q.user_id = auth.uid())
);
CREATE POLICY "Users can update their own quote items" ON public.quote_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_items.quote_id AND q.user_id = auth.uid())
);
CREATE POLICY "Users can delete their own quote items" ON public.quote_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_items.quote_id AND q.user_id = auth.uid())
);

-- Create RLS policies for time_entries
CREATE POLICY "Users can view their own time entries" ON public.time_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own time entries" ON public.time_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own time entries" ON public.time_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own time entries" ON public.time_entries FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for expenses
CREATE POLICY "Users can view their own expenses" ON public.expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own expenses" ON public.expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own expenses" ON public.expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own expenses" ON public.expenses FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for payment_reminders
CREATE POLICY "Users can view their own payment reminders" ON public.payment_reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own payment reminders" ON public.payment_reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own payment reminders" ON public.payment_reminders FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for customer_users
CREATE POLICY "Users can view their own customer users" ON public.customer_users FOR SELECT USING (
  EXISTS (SELECT 1 FROM clients c WHERE c.id = customer_users.client_id AND c.user_id = auth.uid())
);
CREATE POLICY "Users can insert their own customer users" ON public.customer_users FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM clients c WHERE c.id = customer_users.client_id AND c.user_id = auth.uid())
);
CREATE POLICY "Users can update their own customer users" ON public.customer_users FOR UPDATE USING (
  EXISTS (SELECT 1 FROM clients c WHERE c.id = customer_users.client_id AND c.user_id = auth.uid())
);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_quote_items_updated_at BEFORE UPDATE ON public.quote_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON public.time_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_customer_users_updated_at BEFORE UPDATE ON public.customer_users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Create function to convert quote to invoice
CREATE OR REPLACE FUNCTION public.convert_quote_to_invoice(quote_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_invoice_id uuid;
  quote_record record;
  item_record record;
BEGIN
  -- Get the quote
  SELECT * INTO quote_record FROM public.quotes WHERE id = quote_id AND user_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found or access denied';
  END IF;
  
  -- Create the invoice
  INSERT INTO public.invoices (
    user_id, client_id, number, subtotal, tax, total, notes, issue_date, status
  ) VALUES (
    quote_record.user_id,
    quote_record.client_id,
    'INV-' || EXTRACT(year FROM now()) || '-' || LPAD(nextval('invoice_number_seq')::text, 4, '0'),
    quote_record.subtotal,
    quote_record.tax,
    quote_record.total,
    quote_record.notes,
    now()::date,
    'draft'
  ) RETURNING id INTO new_invoice_id;
  
  -- Copy quote items to invoice items
  FOR item_record IN SELECT * FROM public.quote_items WHERE quote_id = quote_record.id LOOP
    INSERT INTO public.invoice_items (
      invoice_id, description, quantity, unit_price, amount, position
    ) VALUES (
      new_invoice_id,
      item_record.description,
      item_record.quantity,
      item_record.unit_price,
      item_record.amount,
      item_record.position
    );
  END LOOP;
  
  -- Update quote status
  UPDATE public.quotes SET status = 'converted' WHERE id = quote_id;
  
  RETURN new_invoice_id;
END;
$$;

-- Create sequence for invoice numbering if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1000;