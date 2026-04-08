# LedgeIt — Database

PostgreSQL database hosted on Supabase.

## Prerequisites

- [psql](https://www.postgresql.org/download/) CLI installed
- `DATABASE_URL` connection string — copy from **Supabase → Settings → Database → Connection String (URI)**

## Running Migrations

Migrations are in `db/migrations/`, numbered sequentially. Run them in order. All migrations are idempotent — safe to re-run.

### Via Supabase SQL Editor (recommended)

Paste each file's contents into **Supabase → SQL Editor → New query** and run.

### Via psql

```bash
psql $DATABASE_URL -f db/migrations/0001_create_transactions.sql
psql $DATABASE_URL -f db/migrations/0002_create_budget_limits.sql
```

## Seeding Dev Data

1. Open `db/seeds/dev_seed.sql`
2. Replace `'00000000-0000-0000-0000-000000000000'` with your user UUID
   - Find it in **Supabase → Authentication → Users → copy User UID**
3. Run:

```bash
psql $DATABASE_URL -f db/seeds/dev_seed.sql
```

## Schema Overview

| Table           | Purpose                                         |
|-----------------|-------------------------------------------------|
| `transactions`  | User financial transactions (RLS enforced)      |
| `budget_limits` | Per-category monthly budget limits (RLS enforced) |

Row Level Security (RLS) is enabled on both tables. Users can only read and write their own rows — enforced by `auth.uid() = user_id` policies.

## Column Reference

### `transactions`

| Column        | Type           | Notes                          |
|---------------|----------------|--------------------------------|
| `id`          | UUID           | PK, auto-generated             |
| `user_id`     | UUID           | FK → `auth.users`, cascade delete |
| `amount`      | NUMERIC(12,2)  | Always positive                |
| `type`        | TEXT           | `'income'` or `'expense'`       |
| `merchant`    | TEXT           |                                |
| `category_id` | TEXT           | Matches `CategoryId` in types  |
| `notes`       | TEXT           | Optional                       |
| `raw`         | TEXT           | Original input text            |
| `confidence`  | NUMERIC(4,3)   | Categorizer score 0–1          |
| `is_recurring`| BOOLEAN        |                                |
| `date`        | DATE           | YYYY-MM-DD                     |
| `created_at`  | TIMESTAMPTZ    | Auto-set to `now()`            |

### `budget_limits`

| Column         | Type          | Notes                                      |
|----------------|---------------|--------------------------------------------|
| `id`           | UUID          | PK, auto-generated                         |
| `user_id`      | UUID          | FK → `auth.users`, cascade delete          |
| `category_id`  | TEXT          | Matches `CategoryId` in types              |
| `limit_amount` | NUMERIC(12,2) |                                            |
| `month`        | TEXT          | Format `YYYY-MM`; UNIQUE per user+category |
