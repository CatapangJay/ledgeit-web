-- [0002_create_budget_limits.sql]
-- Creates the budget_limits table with RLS policies.
-- Idempotent: safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS public.budget_limits (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id   TEXT        NOT NULL,
  limit_amount  NUMERIC(12, 2) NOT NULL,
  month         TEXT        NOT NULL, -- Format: YYYY-MM
  UNIQUE (user_id, category_id, month)
);

-- Row Level Security
ALTER TABLE public.budget_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "budget_limits_select_own" ON public.budget_limits;
CREATE POLICY "budget_limits_select_own"
  ON public.budget_limits FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "budget_limits_insert_own" ON public.budget_limits;
CREATE POLICY "budget_limits_insert_own"
  ON public.budget_limits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "budget_limits_update_own" ON public.budget_limits;
CREATE POLICY "budget_limits_update_own"
  ON public.budget_limits FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "budget_limits_delete_own" ON public.budget_limits;
CREATE POLICY "budget_limits_delete_own"
  ON public.budget_limits FOR DELETE
  USING (auth.uid() = user_id);

COMMIT;
