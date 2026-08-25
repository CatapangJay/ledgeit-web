-- [0012_create_wallets.sql]
-- Wallets: named pockets the user sets money aside into — Savings, Investments,
-- an emergency fund, etc. — so they can see how much is stashed in each.
-- Moving money into or out of a wallet is NOT spending or earning; it's money
-- shuffling between the user's own pockets. Each movement therefore links to a
-- `transfer` ledger transaction (transaction_id), which is already excluded from
-- spending/income analytics — mirroring how debts work.
-- Idempotent: safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS public.wallets (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  kind        TEXT        NOT NULL DEFAULT 'savings'
                          CHECK (kind IN ('savings', 'investment', 'emergency', 'goal', 'cash', 'other')),
  icon        TEXT        NOT NULL DEFAULT 'PiggyBank',
  color       TEXT        NOT NULL DEFAULT 'teal',
  target      NUMERIC(12, 2),          -- optional goal amount (NULL = no goal)
  note        TEXT,
  is_archived BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own wallets" ON public.wallets;
CREATE POLICY "Users manage own wallets" ON public.wallets
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.wallet_movements (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id      UUID           NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  type           TEXT           NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  amount         NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  date           DATE           NOT NULL,
  note           TEXT,
  transaction_id UUID,          -- linked `transfer` ledger transaction (nullable)
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own wallet movements" ON public.wallet_movements;
CREATE POLICY "Users manage own wallet movements" ON public.wallet_movements
  FOR ALL
  USING (
    auth.uid() = (SELECT user_id FROM public.wallets WHERE id = wallet_id)
  )
  WITH CHECK (
    auth.uid() = (SELECT user_id FROM public.wallets WHERE id = wallet_id)
  );

COMMIT;
