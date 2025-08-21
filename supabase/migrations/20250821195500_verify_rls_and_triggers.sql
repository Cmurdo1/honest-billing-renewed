-- Enable/verify RLS on clients and invoices, add optional update trigger for recurring

-- 1) Ensure RLS is enabled
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoices ENABLE ROW LEVEL SECURITY;

-- 2) Policies: users can access their own rows only
DO $$
BEGIN
  -- Clients policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='clients' AND policyname='Users can view their own clients'
  ) THEN
    CREATE POLICY "Users can view their own clients"
      ON public.clients FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='clients' AND policyname='Users can insert their own clients'
  ) THEN
    CREATE POLICY "Users can insert their own clients"
      ON public.clients FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='clients' AND policyname='Users can update their own clients'
  ) THEN
    CREATE POLICY "Users can update their own clients"
      ON public.clients FOR UPDATE TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='clients' AND policyname='Users can delete their own clients'
  ) THEN
    CREATE POLICY "Users can delete their own clients"
      ON public.clients FOR DELETE TO authenticated
      USING (user_id = auth.uid());
  END IF;

  -- Invoices policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='invoices' AND policyname='Users can view their own invoices'
  ) THEN
    CREATE POLICY "Users can view their own invoices"
      ON public.invoices FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='invoices' AND policyname='Users can insert their own invoices'
  ) THEN
    CREATE POLICY "Users can insert their own invoices"
      ON public.invoices FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='invoices' AND policyname='Users can update their own invoices'
  ) THEN
    CREATE POLICY "Users can update their own invoices"
      ON public.invoices FOR UPDATE TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='invoices' AND policyname='Users can delete their own invoices'
  ) THEN
    CREATE POLICY "Users can delete their own invoices"
      ON public.invoices FOR DELETE TO authenticated
      USING (user_id = auth.uid());
  END IF;
END$$;

-- 3) Optional: Also enforce Pro on recurring updates (reactivation)
CREATE OR REPLACE FUNCTION public.enforce_pro_only_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_pro_user(NEW.user_id) THEN
    RAISE EXCEPTION 'This feature requires a Pro subscription.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_enforce_pro_recurring_upd') THEN
    DROP TRIGGER trg_enforce_pro_recurring_upd ON public.recurring_invoices;
  END IF;
END$$;

-- Comment out the CREATE TRIGGER below if you do not want update enforcement
CREATE TRIGGER trg_enforce_pro_recurring_upd
BEFORE UPDATE ON public.recurring_invoices
FOR EACH ROW
EXECUTE FUNCTION public.enforce_pro_only_update();

