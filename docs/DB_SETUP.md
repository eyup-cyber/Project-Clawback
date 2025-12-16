# Database Setup and Connection Guidance

## 1) Supabase projects
- **Production**: create project `scroungers-prod` in the region closest to your audience (e.g., `eu-west-2` for UK).
- **Staging**: create project `scroungers-staging` in the same region with smaller compute.
- Enable extensions: `pg_stat_statements`, `pgcrypto`, `pg_trgm`.
- Enable Point-in-Time Recovery and automated backups (daily, 30-day retention).

## 2) Connection pooling (Supavisor)
- Use **transaction pooling** for serverless deployments.
- Keep pool sizes conservative to avoid exhausting Postgres connections.
- Suggested starting point:
  - `max_connections`: follow Supabase plan limit.
  - App pool size: 5–10 per function region for production, 2–4 for staging.
  - Statement timeout: 30s; idle-in-transaction timeout: 60s.
- Monitor `pg_stat_activity` and `pg_stat_statements` to adjust.

## 3) Environment variables (already validated by code)
- Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-side only), `NEXT_PUBLIC_SITE_URL`, `CSRF_SECRET`.
- See `env/production.example`, `env/staging.example`, `env/local.example`.
- Run `npm run validate:env` to check presence/format.

## 4) Timeouts and retries
- `lib/supabase/fetch.ts` adds a timeout and retry wrapper for Supabase requests.
- Configure via env:
  - `SUPABASE_FETCH_TIMEOUT_MS` (default 10000)
  - `SUPABASE_FETCH_MAX_RETRIES` (default 2)
- Applied in `lib/supabase/server.ts` and `lib/supabase/middleware.ts` through the `global.fetch` option.

## 5) Service role usage
- The service role key is required for privileged operations (migrations, admin tasks). Do **not** expose it to the browser.
- For API routes and server components, use the server client (`lib/supabase/server.ts`) or service client with care.

## 6) Migrations
- Existing migrations: `supabase/migrations/001_initial_schema.sql` through `005_audit_logs.sql`.
- Add future migrations in numeric order under `supabase/migrations/`.
- (Upcoming) Runner/rollback scripts will live under `scripts/` to apply in order and track state.

## 7) Monitoring and tuning checklist
- Track slow queries with `pg_stat_statements`.
- Add missing indexes for heavy queries (see planned search/filter indexes).
- Watch connection utilization and adjust pool sizes or Supabase compute tier.
- Set alerts on error rates/timeouts at the application layer and on database CPU/connection limits in Supabase.

