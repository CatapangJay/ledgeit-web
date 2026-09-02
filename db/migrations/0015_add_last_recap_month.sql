-- [0015_add_last_recap_month.sql]
-- Remember the last month whose end-of-month recap a user has already seen.
-- The dashboard celebrates the just-finished month once, on the user's first
-- visit of the new month; this column is how we show it only once. It stores the
-- RECAP month (the month being summarised) as a 'YYYY-MM' string — e.g. after a
-- user acknowledges August's recap, this is set to '2026-08'. NULL means no
-- recap has been seen yet. Lives on user_settings alongside other per-user prefs.
-- Idempotent: safe to re-run.

BEGIN;

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS last_recap_month TEXT;

COMMIT;
