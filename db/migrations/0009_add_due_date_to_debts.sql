-- [0009_add_due_date_to_debts.sql]
-- Adds an optional expected-repayment date to debts so the app can surface
-- due-soon / overdue reminders. Nullable — existing debts stay open-ended.
-- Idempotent: safe to re-run.

BEGIN;

ALTER TABLE public.debts
  ADD COLUMN IF NOT EXISTS due_date DATE;

-- Index the due date to keep "upcoming / overdue" lookups cheap.
CREATE INDEX IF NOT EXISTS debts_due_date_idx ON public.debts(due_date);

COMMIT;
