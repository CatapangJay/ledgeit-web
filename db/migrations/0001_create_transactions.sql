-- [0001_create_transactions.sql]
-- Creates the transactions table with RLS policies.
-- Idempotent: safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS public.transactions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount       NUMERIC(12, 2) NOT NULL,
  type         TEXT        NOT NULL CHECK (type IN ('income', 'expense')),
  merchant     TEXT        NOT NULL DEFAULT '',
  category_id  TEXT        NOT NULL DEFAULT 'other',
  notes        TEXT,
  raw          TEXT        NOT NULL DEFAULT '',
  confidence   NUMERIC(4, 3) NOT NULL DEFAULT 1.000,
  is_recurring BOOLEAN     NOT NULL DEFAULT FALSE,
  date         DATE        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_select_own" ON public.transactions;
CREATE POLICY "transactions_select_own"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "transactions_insert_own" ON public.transactions;
CREATE POLICY "transactions_insert_own"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "transactions_update_own" ON public.transactions;
CREATE POLICY "transactions_update_own"
  ON public.transactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "transactions_delete_own" ON public.transactions;
CREATE POLICY "transactions_delete_own"
  ON public.transactions FOR DELETE
  USING (auth.uid() = user_id);

COMMIT;
