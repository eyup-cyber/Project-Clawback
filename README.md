# Project Clawback — Scroungers Multimedia

Production-ready Next.js app with structured logging, security hardening, Supabase backend, R2 media storage, Resend email, and comprehensive tests.

## Features
- Structured logging with request correlation and performance metrics.
- Centralized API error handling, consistent responses, and Zod validation.
- CSRF protection for state-changing routes; security headers + sanitization.
- Supabase schema with RLS; migrations under `supabase/migrations`.
- Email templates + queue (Resend), plus alerting hooks.
- Media storage via Cloudflare R2 with presigned uploads.
- Metrics endpoint (`/api/metrics`) and health checks.
- Jest unit/integration tests; Husky hooks for lint, type-check, tests.

## Tech Stack
Next.js (App Router), TypeScript, Supabase, Cloudflare R2, Resend, Redis (optional cache), Jest, ESLint/Prettier, Husky/Commitlint.

## Getting Started
```bash
npm install
npm run dev
```
App runs at http://localhost:3000.

### Environment
Copy `.env.example` (if provided) or set variables:
- `NEXT_PUBLIC_SITE_URL`, `SITE_URL`, `SITE_NAME`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
- `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ACCOUNT_ID`, `R2_PUBLIC_URL`
- `RESEND_API_KEY`, `ADMIN_EMAIL`
- `CSRF_SECRET`
- `ALERT_WEBHOOK_URL` (optional)
- `REDIS_URL` (optional cache; rate limiting is disabled)

### Migrations
```bash
# adjust to your supabase CLI setup
supabase db push
```
SQL files live in `supabase/migrations`.

### Scripts
- `npm run dev` — start dev server
- `npm run lint` — lint via ESLint
- `npm run test` — unit + integration tests
- `npm run type-check` — TypeScript diagnostics
- `npm run prepare` — Husky install

### Testing Notes
Jest configured in `jest.config.js`; setup in `lib/test/setup.ts`. Integration tests target API routes in `__tests__/integration`.

### APIs & Docs
- API handlers under `app/api/**` wrapped with `withRouteHandler`.
- OpenAPI draft: `docs/openapi.yaml`.
- Metrics: `GET /api/metrics` (Prometheus format).

### Security
- CSRF double-submit cookie for POST/PUT/PATCH/DELETE via `requiresCsrfProtection`.
- Security headers applied globally; XSS/input sanitization helpers in `lib/security`.

### Email
Templates in `lib/email/templates.ts`; queue with retries in `lib/email/queue.ts` using Resend client.

### Caching
In-memory cache with TTL in `lib/cache`. Redis optional for future cache features (rate limiting is off per requirements).

### Monitoring & Alerts
Health checks in `lib/monitoring/health.ts`; alerts helper in `lib/monitoring/alerts.ts` (email/webhook).

## Contributing
Husky hooks run lint-staged, commitlint, type-check, and tests on push. Use conventional commits. PRs welcome.
