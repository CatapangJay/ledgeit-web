-- [0018_add_transaction_tags.sql]
-- Free-form tags on transactions (e.g. "Oct Vacation", "Wedding") so the user
-- can total spending across categories and months for one event or project.
-- Stored as a text array on the row — tags are personal labels, not shared
-- entities, so a join table isn't worth it. Legacy rows default to empty.
--
-- add_transaction_tags appends tags server-side in one atomic statement, so a
-- bulk "tag these 50 entries" never overwrites tags another device added and
-- never half-applies. It mirrors packages/core/tags.ts normalizeTags: matching
-- is case-insensitive, the existing spelling wins, and a row keeps at most 10.
-- SECURITY INVOKER (the default), so the transactions RLS policies still apply.
-- Idempotent: safe to re-run.

BEGIN;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.add_transaction_tags(p_ids uuid[], p_tags text[])
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.transactions AS t
  SET tags = (
    SELECT coalesce(array_agg(tag ORDER BY ord), '{}')
    FROM (
      SELECT tag, ord
      FROM (
        SELECT tag, ord,
               row_number() OVER (PARTITION BY lower(tag) ORDER BY ord) AS rn
        FROM unnest(t.tags || p_tags) WITH ORDINALITY AS u(tag, ord)
        WHERE btrim(tag) <> ''
      ) ranked
      WHERE rn = 1
      ORDER BY ord
      LIMIT 10
    ) kept
  )
  WHERE t.id = ANY(p_ids)
    AND t.user_id = auth.uid();
$$;

COMMIT;
