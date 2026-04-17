-- ─── Income Allocations ───────────────────────────────────────────────────────
-- Named monthly income plans. Each plan holds per-source expected amounts.
-- Only one allocation may be active per user at a time.

CREATE TABLE IF NOT EXISTS income_allocations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE income_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own income allocations" ON income_allocations;
CREATE POLICY "Users manage own income allocations" ON income_allocations
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Income Allocation Items ──────────────────────────────────────────────────
-- Per-source expected monthly amount rows that belong to an income allocation.

CREATE TABLE IF NOT EXISTS income_allocation_items (
  id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_id UUID           NOT NULL REFERENCES income_allocations(id) ON DELETE CASCADE,
  source_id     TEXT           NOT NULL,
  amount        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  UNIQUE (allocation_id, source_id)
);

ALTER TABLE income_allocation_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own income allocation items" ON income_allocation_items;
CREATE POLICY "Users manage own income allocation items" ON income_allocation_items
  FOR ALL
  USING (
    auth.uid() = (
      SELECT user_id FROM income_allocations WHERE id = allocation_id
    )
  )
  WITH CHECK (
    auth.uid() = (
      SELECT user_id FROM income_allocations WHERE id = allocation_id
    )
  );
