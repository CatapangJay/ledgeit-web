-- Dev seed data
-- Replace '00000000-0000-0000-0000-000000000000' with your actual user UUID.
-- Find it in: Supabase Dashboard → Authentication → Users → copy User UID.
--
-- Usage:
--   psql $DATABASE_URL -f db/seeds/dev_seed.sql
--
-- To use psql variable substitution instead:
--   psql $DATABASE_URL -v uid="'your-uuid-here'" -f db/seeds/dev_seed.sql
--   and replace the DO block variable with: :uid::uuid

DO $$
DECLARE
  v_user UUID := '00000000-0000-0000-0000-000000000000';
  v_month TEXT := to_char(CURRENT_DATE, 'YYYY-MM');
BEGIN

  INSERT INTO public.transactions
    (user_id, amount, type, merchant, category_id, raw, confidence, is_recurring, date, created_at)
  VALUES
    (v_user, 42500.00, 'income',  'Salary',   'income',        'received 42500 salary',        0.990, FALSE, CURRENT_DATE - 6, now() - interval '144 hours'),
    (v_user,    85.00, 'expense', 'Grab',      'restaurants',   '$85 grab eats dinner',         0.930, FALSE, CURRENT_DATE - 5, now() - interval '120 hours'),
    (v_user,  2800.00, 'expense', 'SM',        'groceries',     '2800 sm grocery run',          0.880, FALSE, CURRENT_DATE - 4, now() - interval '96 hours'),
    (v_user,   649.00, 'expense', 'Netflix',   'entertainment', 'netflix monthly 649',          0.970, TRUE,  CURRENT_DATE - 3, now() - interval '72 hours'),
    (v_user,  1840.00, 'expense', 'Meralco',   'utilities',     'meralco bill 1840',            0.960, FALSE, CURRENT_DATE - 2, now() - interval '48 hours'),
    (v_user,   120.00, 'expense', 'Grab',      'transport',     'grab 120 morning commute',     0.940, FALSE, CURRENT_DATE - 1, now() - interval '26 hours'),
    (v_user,   215.00, 'expense', 'Jollibee',  'restaurants',   'jollibee lunch 215',           0.950, FALSE, CURRENT_DATE,     now() - interval '5 hours'),
    (v_user,  1375.00, 'expense', 'Shopee',    'shopping',      'shopee haul 1375',             0.910, FALSE, CURRENT_DATE,     now() - interval '2 hours')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.budget_limits (user_id, category_id, limit_amount, month)
  VALUES
    (v_user, 'restaurants',   5000.00, v_month),
    (v_user, 'groceries',     8000.00, v_month),
    (v_user, 'transport',     3000.00, v_month),
    (v_user, 'shopping',      4000.00, v_month),
    (v_user, 'utilities',     3500.00, v_month),
    (v_user, 'entertainment', 2000.00, v_month),
    (v_user, 'health',        2000.00, v_month)
  ON CONFLICT (user_id, category_id, month) DO NOTHING;

END;
$$;
