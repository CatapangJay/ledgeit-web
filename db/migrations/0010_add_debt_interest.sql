-- [0010_add_debt_interest.sql]
-- Adds interest tracking to debt repayments. A repayment's `amount` reduces the
-- outstanding principal (recorded as a `transfer` — money moving between your
-- own pockets, not spending/earning). Any `interest` paid alongside is a TRUE
-- expense (or income, when someone pays you interest) and links to its own
-- ledger transaction so it — and only it — moves your income/expense totals.
-- Idempotent: safe to re-run.

BEGIN;

ALTER TABLE public.debt_repayments
  ADD COLUMN IF NOT EXISTS interest                NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (interest >= 0),
  ADD COLUMN IF NOT EXISTS interest_transaction_id UUID;  -- linked interest expense/income (nullable)

-- Allow interest-only repayments (principal 0) for interest-bearing loans.
-- The original constraint required amount > 0; a repayment is now valid as long
-- as it moves *something* (principal or interest), enforced in the app layer.
ALTER TABLE public.debt_repayments DROP CONSTRAINT IF EXISTS debt_repayments_amount_check;
ALTER TABLE public.debt_repayments ADD  CONSTRAINT debt_repayments_amount_check CHECK (amount >= 0);

COMMIT;
