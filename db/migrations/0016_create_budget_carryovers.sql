-- [0016_create_budget_carryovers.sql]
-- End-of-month budget carryovers. When the user reviews the recap of the month
-- that just ended, they may carry a category's leftover (under budget) or its
-- overage (over budget) into the NEXT month. The carried amount:
--   • "to category" — adjusts only that category's EFFECTIVE limit for `to_month`
--     (positive = extra budget from leftover; negative = reduced budget from an
--     overage). The saved budget plan is untouched — this is a one-month-only
--     adjustment layered on top of the plan's limit for `to_month`.
--   • "to wallet"   — moves the balance between day-to-day money and one of the
--     user's wallets: a leftover (positive) deposits into the wallet; an overage
--     (negative) withdraws from it to cover the overspend.
--
-- Every carryover links to a `transfer` ledger transaction (transaction_id) so
-- the movement is tracked in history WITHOUT counting toward the destination
-- month's spending/income — mirroring how debts and wallets work.
--
-- One carryover per (user, category, from_month): a category's end-of-month
-- balance can only be rolled forward once. Idempotent: safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS public.budget_carryovers (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id    TEXT           NOT NULL,
  -- 'YYYY-MM' of the month whose balance is being carried (the recapped month).
  from_month     TEXT           NOT NULL,
  -- 'YYYY-MM' the amount lands in (always from_month + 1).
  to_month       TEXT           NOT NULL,
  -- Signed: positive = leftover rolled forward, negative = overage pulled back.
  amount         NUMERIC(12, 2) NOT NULL,
  -- Where the amount goes: 'category' adjusts next month's limit; 'wallet'
  -- deposits the leftover into wallet_id.
  destination    TEXT           NOT NULL DEFAULT 'category'
                                CHECK (destination IN ('category', 'wallet')),
  -- Set only when destination = 'wallet'.
  wallet_id      UUID           REFERENCES public.wallets(id) ON DELETE SET NULL,
  -- Linked `transfer` ledger transaction for the movement (nullable).
  transaction_id UUID,
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id, from_month)
);

CREATE INDEX IF NOT EXISTS budget_carryovers_user_to_month_idx
  ON public.budget_carryovers (user_id, to_month);

ALTER TABLE public.budget_carryovers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own carryovers" ON public.budget_carryovers;
CREATE POLICY "Users manage own carryovers" ON public.budget_carryovers
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMIT;
