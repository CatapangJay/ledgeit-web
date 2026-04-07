---
name: postgresql
description: "Skill for working with PostgreSQL in codebases: schema design, migrations, queries, performance, backups, and CI patterns. Use when authoring SQL, generating migrations, reviewing schema changes, or crafting DB-related CI/Ops steps. DOES NOT store or expose secrets."
---

# PostgreSQL Skill

Purpose: provide focused, repeatable guidance and templates for common PostgreSQL tasks in a repository (migrations, schema review, query optimization, backup/restore, CI job snippets, and safe secrets handling).

When to use:
- You need to write or review SQL, generate or modify a migration, or scaffold schema/seed files.
- You want CI job templates for running migrations, backups, or schema checks.
- You need safe examples for connecting to Postgres in local/dev/CI (without secrets in repo).

Scope:
- Workspace-scoped skill under `.github/skills/postgresql/` for team use.
- Not for storing credentials — always recommend env vars or secrets manager.

Decision Flow
- If user asks for a single SQL snippet → return a concise SQL example and short explanation.
- If user asks to scaffold migrations or seeds → propose a migration outline and file layout, include 1–2 example migration files.
- If user asks for CI integration → return a GitHub Actions job snippet that uses repository secrets and `psql`/`pg_restore`/`pg_dump` utilities.
- If user asks for performance tuning → ask for table schema and query, then suggest indexes, EXPLAIN ANALYZE guidance, and sample rewrite.
- If user asks for backup/restore → provide `pg_dump` and `pg_restore` examples and recommended retention/rotation notes.

Safety & Best Practices
- Never include raw credentials or connection strings in the repo. Use placeholders like `PG_CONN` and instruct use of `secrets.*` or environment variables.
- Recommend `psql` CLI, `pg_dump`, `pg_restore`, and `pgbench` for benchmarking.
- Prefer idempotent migrations and reversible steps where possible.
- Recommend running `EXPLAIN (ANALYZE, BUFFERS)` for performance checks in non-production snapshots.

File Organization Suggestions
- `db/migrations/` — migration SQL or JS/TS migration files (knex, prisma, typeorm, etc.)
- `db/seeds/` — seed data scripts or SQL
- `db/schema/` — canonical latest schema SQL (optional)
- `db/README.md` — onboarding steps to run local DB, seed, and run migrations

Templates

- SQL migration header (SQL file):

  -- [0001_create_users.sql]
  BEGIN;
  CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  );
  COMMIT;

- Migration (reversible) pattern (psql-friendly):

  -- Up
  BEGIN;
  CREATE TABLE foo (...);
  COMMIT;

  -- Down (if maintaining paired files, include drop in separate file or comment)

- GitHub Actions job (CI) snippet (uses repo secret `PG_CONN`):

  name: Postgres CI
  on: [push, pull_request]
  jobs:
    postgres-checks:
      runs-on: ubuntu-latest
      services:
        postgres:
          image: postgres:15
          env:
            POSTGRES_DB: test
            POSTGRES_USER: postgres
            POSTGRES_PASSWORD: postgres
          ports:
            - 5432:5432
          options: >-
            --health-cmd "pg_isready -U postgres" --health-interval 10s --health-timeout 5s --health-retries 5
      steps:
        - uses: actions/checkout@v4
        - name: Wait for Postgres
          run: |-
            until pg_isready -h localhost -p 5432; do sleep 1; done
        - name: Run migrations
          env:
            DATABASE_URL: postgres://postgres:postgres@localhost:5432/test
          run: |
            # adapt to your migration tool (knex, prisma, etc.)
            npm ci
            npm run migrate:ci

Note: In team repos prefer using the service container `postgres` for ephemeral CI DBs rather than embedding prod connection strings.

Common Prompts / Examples
- "Create a reversible SQL migration to add a `last_login` TIMESTAMP column to `users` and backfill from `events` table where event_type='login'"
- "Suggest indexes for this query and explain tradeoffs: SELECT ... WHERE user_id = $1 AND created_at > $2"
- "Generate a minimal GitHub Actions workflow that runs migrations and seeds an ephemeral database for tests"
- "Write a `pg_dump` command to create a compressed backup of the `production` DB to S3 using `--format=custom`"

Operational Recipes
- Backup (local):
  pg_dump -Fc "$PG_CONN" -f backup-$(date +%F).dump

- Restore (local):
  pg_restore --verbose --clean --no-acl --no-owner -d "$PG_CONN" backup.dump

- Run psql against a connection string (example with env var):
  PGPASSWORD="$PG_PASSWORD" psql "$PG_CONN" -c "\dt"

- Run EXPLAIN ANALYZE:
  EXPLAIN (ANALYZE, BUFFERS, VERBOSE) <your query here>;

Security & Secrets
- Use `secrets.PG_CONN` or `env.PG_CONN` in CI; never include `postgres://user:pass@host/db` literal in commits.
- When sharing sample commands, always replace sensitive values with placeholders.

Quality Checklist (for skill responses)
- Ask whether the environment is managed (RDS/Cloud SQL) or self-hosted.
- Ask for DB version (Postgres 12/13/14/15+) when recommending features (e.g., `gen_random_uuid()` needs `pgcrypto`/`pgcrypto` or `pgcrypto` extension availability depending on version).
- Confirm whether migrations are SQL-first or ORM-managed (Prisma/TypeORM/Knex).
- When providing CI snippets, default to ephemeral service container usage.
- Include reversible migration guidance where possible.

How to Extend
- Add providers: add small subfolders for `prisma/`, `knex/`, `typeorm/` with migration examples for each.
- Add a `templates/` folder with ready-to-copy migration files.

Interaction Examples (for user to paste into chat)
- "/skill postgresql: scaffold a migration to add products table with SKU unique index"
- "/skill postgresql: suggest indexes for this query (paste query)"
- "/skill postgresql: provide GitHub Actions job to run migrations with a Postgres service container"

Notes for Maintainers
- Keep examples up-to-date with the repo's preferred migration tool.
- If the repository uses an ORM (Prisma, TypeORM), add tool-specific examples into `prisma/` or `typeorm/` subfolders.
- Do not store or suggest storing plaintext credentials in these files.

---
Generated-by: agent-customization-guided flow
