-- [0008_create_debts.sql]
-- Debt ledger: money the user lent out (owed_to_me) or borrowed (i_owe), plus
-- their repayments. Each debt/repayment optionally links to a ledger
-- transaction (transaction_id) so the money movement shows in totals.
-- Idempotent: safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS public.debts (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_name    TEXT           NOT NULL,
  direction      TEXT           NOT NULL CHECK (direction IN ('owed_to_me', 'i_owe')),
  principal      NUMERIC(12, 2) NOT NULL CHECK (principal > 0),
  note           TEXT,
  is_settled     BOOLEAN        NOT NULL DEFAULT FALSE,
  transaction_id UUID,          -- linked origination transaction (nullable)
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT now()
);

ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own debts" ON public.debts;
CREATE POLICY "Users manage own debts" ON public.debts
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.debt_repayments (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id        UUID           NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  amount         NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  date           DATE           NOT NULL,
  transaction_id UUID,          -- linked repayment transaction (nullable)
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT now()
);

ALTER TABLE public.debt_repayments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own debt repayments" ON public.debt_repayments;
CREATE POLICY "Users manage own debt repayments" ON public.debt_repayments
  FOR ALL
  USING (
    auth.uid() = (SELECT user_id FROM public.debts WHERE id = debt_id)
  )
  WITH CHECK (
    auth.uid() = (SELECT user_id FROM public.debts WHERE id = debt_id)
  );

COMMIT;
