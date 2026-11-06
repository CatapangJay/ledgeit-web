-- [0017_create_user_entitlements.sql]
-- Per-user plan entitlements. Gates premium-only features — currently cloud
-- sync from the mobile app (free mobile users keep data on-device only; premium
-- users sync to these Supabase tables so the same data is reachable from web
-- and any other device).
--
-- SECURITY: users may READ their own row but can NEVER write it. Rows are only
-- inserted/updated with the service role (billing webhook — RevenueCat / App
-- Store / Play — or manually from the Supabase dashboard). Do not add an
-- INSERT/UPDATE policy for `authenticated`, or users could self-grant premium.
-- Idempotent: safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS public.user_entitlements (
  user_id     UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_premium  BOOLEAN     NOT NULL DEFAULT FALSE,
  -- NULL = no expiry (lifetime / manually granted).
  expires_at  TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own entitlements" ON public.user_entitlements;
CREATE POLICY "Users read own entitlements" ON public.user_entitlements
  FOR SELECT
  USING (auth.uid() = user_id);

-- Belt and braces: even if a permissive policy is added later, the API roles
-- can't write this table.
REVOKE INSERT, UPDATE, DELETE ON public.user_entitlements FROM anon, authenticated;

COMMIT;

-- Grant premium manually (run as service role / SQL editor):
--   INSERT INTO public.user_entitlements (user_id, is_premium)
--   VALUES ('<user-uuid>', TRUE)
--   ON CONFLICT (user_id) DO UPDATE SET is_premium = EXCLUDED.is_premium, updated_at = now();
