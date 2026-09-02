-- [0014_add_reimbursement_flag.sql]
-- Flag a transaction as a reimbursement/refund.
-- A reimbursement is filed UNDER an expense category but, instead of adding to
-- that category's spending, it subtracts from it (freeing budget) and adds the
-- money back to the balance (e.g. a ₱500 grocery refund → grocery spend −500,
-- net +500). It stays type 'expense' and keeps its category; this flag is what
-- distinguishes it. Legacy rows default to false (a normal expense).
-- Idempotent: safe to re-run.

BEGIN;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS is_reimbursement boolean NOT NULL DEFAULT false;

COMMIT;
