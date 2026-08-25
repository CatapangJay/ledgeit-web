-- [0013_add_wallet_movement_source.sql]
-- Distinguishes how a wallet movement came to be:
--   'manual' — the user deposited/withdrew directly on the Wallets page. The
--              linked transaction is a `transfer` this app created and owns, so
--              deleting the movement should also delete that transfer.
--   'linked' — the movement mirrors a real expense/income logged in Smart Entry
--              (e.g. "coffee 150" paid from Savings). The linked transaction is
--              that genuine spend/earn and must SURVIVE if the movement is
--              removed — we only detach the wallet-balance effect.
-- Existing rows are all manual (they predate the linked flow).
-- Idempotent: safe to re-run.

BEGIN;

ALTER TABLE public.wallet_movements
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE public.wallet_movements
  DROP CONSTRAINT IF EXISTS wallet_movements_source_check;

ALTER TABLE public.wallet_movements
  ADD CONSTRAINT wallet_movements_source_check
  CHECK (source IN ('manual', 'linked'));

COMMIT;
