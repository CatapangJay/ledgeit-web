-- [0007_add_payment_method.sql]
-- Adds a payment_method column to transactions (how the entry was paid).
-- Defaults to 'cash'; existing rows backfill to 'cash'.
-- Idempotent: safe to re-run.

BEGIN;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cash';

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_payment_method_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_payment_method_check
  CHECK (payment_method IN ('cash', 'credit', 'debit', 'gcash', 'maya', 'bank'));

COMMIT;
