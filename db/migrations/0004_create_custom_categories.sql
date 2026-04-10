-- ─── Custom Categories ────────────────────────────────────────────────────────
-- User-defined categories that supplement the built-in CATEGORIES array.
-- Referenced by category_id in budget_allocation_items.

CREATE TABLE IF NOT EXISTS custom_categories (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  icon       TEXT        NOT NULL DEFAULT 'DotsThree',
  text_color TEXT        NOT NULL DEFAULT 'text-slate-500',
  bg_color   TEXT        NOT NULL DEFAULT 'bg-slate-100',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE custom_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own custom categories" ON custom_categories;
CREATE POLICY "Users manage own custom categories" ON custom_categories
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
