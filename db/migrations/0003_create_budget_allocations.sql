-- ─── Budget Allocations ──────────────────────────────────────────────────────
-- Named, switchable budget plans. Each plan holds per-category spending limits.
-- Only one allocation may be active per user at a time.

CREATE TABLE IF NOT EXISTS budget_allocations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE budget_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own allocations" ON budget_allocations;
CREATE POLICY "Users manage own allocations" ON budget_allocations
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Budget Allocation Items ──────────────────────────────────────────────────
-- Per-category limit rows that belong to a budget allocation.

CREATE TABLE IF NOT EXISTS budget_allocation_items (
  id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_id UUID           NOT NULL REFERENCES budget_allocations(id) ON DELETE CASCADE,
  category_id   TEXT           NOT NULL,
  limit_amount  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  UNIQUE (allocation_id, category_id)
);

ALTER TABLE budget_allocation_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own allocation items" ON budget_allocation_items;
CREATE POLICY "Users manage own allocation items" ON budget_allocation_items
  FOR ALL
  USING (
    auth.uid() = (
      SELECT user_id FROM budget_allocations WHERE id = allocation_id
    )
  )
  WITH CHECK (
    auth.uid() = (
      SELECT user_id FROM budget_allocations WHERE id = allocation_id
    )
  );
