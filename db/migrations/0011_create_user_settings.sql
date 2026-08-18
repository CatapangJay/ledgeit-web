-- [0011_create_user_settings.sql]
-- One row of per-user preferences. Currently holds `hidden_categories` — the
-- preset categories a user has "deleted" (hidden). Preset categories are code
-- constants that can't be removed outright; hiding one drops it from pickers,
-- budget rows, and filters while leaving historical transactions intact.
-- A single-row settings table (rather than a join table) keeps this bounded
-- preference to one read/write, and gives future prefs a home.
-- Idempotent: safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hidden_categories TEXT[]      NOT NULL DEFAULT '{}',
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own settings" ON public.user_settings;
CREATE POLICY "Users manage own settings" ON public.user_settings
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMIT;
