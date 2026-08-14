-- [0006_add_transfer_type.sql]
-- Allow a third transaction type: 'transfer'.
-- A transfer moves money between the user's own pockets (e.g. paying a credit
-- card, moving to savings). It is recorded but excluded from spending/income
-- analytics, so it must not be double-counted against the purchases it settles.
-- Idempotent: safe to re-run.

BEGIN;

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('income', 'expense', 'transfer'));

COMMIT;
