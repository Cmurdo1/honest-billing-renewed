-- Migration: Enable RLS on table `s` and add row-level security policies
-- Created: 2025-08-30
-- Assumption: Supabase/Postgres environment provides auth.uid() which returns the authenticated user's uuid.

BEGIN;

-- Enable row level security on table `s` (if it exists)
ALTER TABLE IF EXISTS public.s
  ENABLE ROW LEVEL SECURITY;

-- Allow SELECT only when the row's client_id matches the authenticated user
CREATE POLICY "s_select_by_client_id"
  ON public.s
  FOR SELECT
  USING (client_id = auth.uid());

-- Allow INSERT only when the provided client_id matches the authenticated user
CREATE POLICY "s_insert_by_client_id"
  ON public.s
  FOR INSERT
  WITH CHECK (client_id = auth.uid());

-- Allow UPDATE only when the row belongs to the authenticated user
-- and ensure updated client_id (if changed) still matches the authenticated user
CREATE POLICY "s_update_by_client_id"
  ON public.s
  FOR UPDATE
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

-- Allow DELETE only when the row belongs to the authenticated user
CREATE POLICY "s_delete_by_client_id"
  ON public.s
  FOR DELETE
  USING (client_id = auth.uid());

COMMIT;

-- Notes:
-- - This migration enforces that all client access to rows in `public.s` is scoped
--   to the row's `client_id` matching the authenticated user's id (auth.uid()).
-- - If you need server/service role access (for background jobs or webhooks),
--   add an additional policy allowing access when the JWT role is `service_role`.
--   Example (add only if you confirm support in your environment):
--
--   CREATE POLICY "s_service_role_full_access"
--     ON public.s
--     FOR ALL
--     USING (auth.role() = 'service_role');
