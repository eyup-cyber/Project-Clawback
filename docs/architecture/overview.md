# Scroungers Multimedia - Architecture Overview

## System Architecture

Scroungers Multimedia is built on a modern, scalable architecture designed for performance, security, and maintainability.

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 15, React 19 | Server-side rendering, client interactivity |
| Styling | Tailwind CSS | Utility-first CSS framework |
| Authentication | Supabase Auth | OAuth, Magic Link, Email/Password |
| Database | PostgreSQL (Supabase) | Primary data store with RLS |
| Storage | Cloudflare R2 | Large media file storage |
| Caching | Redis (optional) | Session and data caching |
| Jobs | BullMQ | Background job processing |
| Monitoring | Sentry | Error tracking and performance |

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Clients                              │
│  (Web Browsers, Mobile Apps, API Consumers)                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    CDN / Edge Network                        │
│                 (Vercel Edge, Cloudflare)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Application                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Pages /   │  │    API      │  │  Middleware │         │
│  │  App Router │  │   Routes    │  │   (Auth)    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    Supabase     │  │  Cloudflare R2  │  │     Redis       │
│  (PostgreSQL)   │  │    (Storage)    │  │    (Cache)      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Directory Structure

```
scroungers-multimedia/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── (marketing)/       # Public marketing pages
│   ├── api/               # API routes
│   ├── admin/             # Admin dashboard
│   ├── dashboard/         # User dashboard
│   └── components/        # React components
├── lib/                   # Shared libraries
│   ├── api/              # API utilities
│   ├── cache/            # Caching layer
│   ├── db/               # Database operations
│   ├── hooks/            # React hooks
│   ├── security/         # Security utilities
│   └── supabase/         # Supabase clients
├── supabase/             # Database migrations
├── docs/                 # Documentation
├── __tests__/            # Test files
└── e2e/                  # E2E tests
```

## Data Flow

### Authentication Flow

1. User initiates login (Email/OAuth/Magic Link)
2. Supabase Auth validates credentials
3. Session token stored in HTTP-only cookie
4. Middleware validates session on each request
5. Profile data fetched from `profiles` table

### Content Flow

1. Author creates/edits post in dashboard
2. Content sanitized and validated
3. Draft saved to `posts` table
4. On publish, triggers editorial workflow
5. Published content cached for performance
6. Webhooks notify subscribers

### API Request Flow

```
Request → Middleware → Rate Limit → Auth Check → Business Logic → Response
                                                        │
                                                        ▼
                                               Cache → Database
```

## Security Architecture

### Defense in Depth

1. **Edge Layer**: DDoS protection, WAF rules
2. **Transport**: TLS 1.3, HSTS
3. **Application**: CSRF protection, input validation
4. **Data**: Row Level Security, encryption at rest
5. **Authentication**: 2FA, session management

### Row Level Security (RLS)

All database tables use Supabase RLS policies:

```sql
-- Users can only read their own data
CREATE POLICY "Users read own data"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Admins can read all data
CREATE POLICY "Admins read all"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );
```

## Scalability

### Horizontal Scaling

- **Stateless API**: Easy to scale with more instances
- **Database**: Supabase handles scaling automatically
- **Cache**: Redis cluster for distributed caching
- **Jobs**: Worker processes scale independently

### Caching Strategy

1. **CDN Cache**: Static assets, public pages
2. **Application Cache**: Redis for API responses
3. **Database Cache**: PostgreSQL query cache
4. **Browser Cache**: ETags, Cache-Control headers

## Monitoring & Observability

### Metrics Collected

- Request latency (p50, p95, p99)
- Error rates by endpoint
- Database query performance
- Cache hit/miss ratios
- Background job throughput

### Alerting

- Error rate > 1% → Warning
- Error rate > 5% → Critical
- Latency p95 > 1s → Warning
- Database connections > 80% → Critical

## Deployment

### Environments

| Environment | Purpose | Database |
|-------------|---------|----------|
| Development | Local development | Local Supabase |
| Staging | Pre-production testing | Staging Supabase |
| Production | Live site | Production Supabase |

### CI/CD Pipeline

1. Push to branch triggers CI
2. Lint, typecheck, test
3. Build application
4. Deploy to preview (PRs)
5. Deploy to production (main)

## Related Documentation

- [Database Schema](./database.md)
- [Security Architecture](./security.md)
- [API Documentation](../api/authentication.md)
- [Deployment Guide](../ops/deployment.md)
