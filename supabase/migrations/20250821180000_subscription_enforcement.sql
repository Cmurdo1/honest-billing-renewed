-- Subscription-based enforcement for HonestInvoice
-- 1) Helper function to determine Pro access (active, trialing, or grace past_due within period)
create or replace function public.is_pro_user(uid uuid)
returns boolean
language sql
security definer
as $$
  with sub as (
    select
      sus.price_id,
      lower(coalesce(sus.status, '')) as status,
      sus.current_period_end
    from public.stripe_user_subscriptions sus
    where sus.user_id = uid
    order by sus.updated_at desc
    limit 1
  )
  select
    case
      when sub.price_id = 'pro_tier' and (sub.status in ('active', 'trialing')) then true
      when sub.price_id = 'pro_tier' and sub.status = 'past_due' and sub.current_period_end is not null and sub.current_period_end > now() then true
      else false
    end
  from sub;
$$;

-- 2) Restrict free users to at most 5 clients at the DB layer
-- We enforce via a BEFORE INSERT trigger to allow clear error messages
create or replace function public.enforce_client_limit()
returns trigger
language plpgsql
security definer
as $$
begin
  if not public.is_pro_user(new.user_id) then
    -- count existing clients for the user
    perform 1 from public.clients
      where user_id = new.user_id
      limit 5;
    -- quick check: if 5th exists we need a precise count
    if found then
      -- get exact count
      if (select count(*) from public.clients where user_id = new.user_id) >= 5 then
        raise exception 'Free plan limit reached: maximum 5 clients. Upgrade to Pro for unlimited clients.' using errcode = 'P0001';
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- Create trigger if not exists
-- Note: using 'create trigger if not exists' is not supported by Postgres, so drop/create defensively
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enforce_client_limit'
  ) THEN
    DROP TRIGGER trg_enforce_client_limit ON public.clients;
  END IF;
END$$;

create trigger trg_enforce_client_limit
before insert on public.clients
for each row
execute function public.enforce_client_limit();

-- 3) Pro-only feature enforcement at DB level
-- Recurring invoices are Pro-only
create or replace function public.enforce_pro_only()
returns trigger
language plpgsql
security definer
as $$
begin
  if not public.is_pro_user(new.user_id) then
    raise exception 'This feature requires a Pro subscription.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enforce_pro_recurring'
  ) THEN
    DROP TRIGGER trg_enforce_pro_recurring ON public.recurring_invoices;
  END IF;
END$$;

create trigger trg_enforce_pro_recurring
before insert on public.recurring_invoices
for each row
execute function public.enforce_pro_only();

-- Optionally guard updates that would reactivate or create behavior; keep simple for now

-- 4) Optionally require Pro for Custom Branding settings if stored in a table (future)
-- Add similar trigger to that table when implemented.

