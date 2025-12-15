# Developer Guide

This guide covers everything you need to set up, develop, test, and deploy the Scroungers Multimedia platform.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Setup](#local-setup)
3. [Environment Variables](#environment-variables)
4. [Database Setup](#database-setup)
5. [Running the Application](#running-the-application)
6. [Project Structure](#project-structure)
7. [Development Workflow](#development-workflow)
8. [Testing](#testing)
9. [Code Style](#code-style)
10. [Git Workflow](#git-workflow)
11. [Deployment](#deployment)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Ensure you have the following installed:

- **Node.js** >= 18.x
- **pnpm** >= 8.x (preferred) or npm >= 9.x
- **Git**
- **Docker** (optional, for local Supabase)

```bash
# Check versions
node --version   # v18.x or higher
pnpm --version   # 8.x or higher
git --version
```

---

## Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/scroungers-multimedia/scroungers-multimedia.git
cd scroungers-multimedia
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration (see [Environment Variables](#environment-variables)).

### 4. Set Up Supabase

**Option A: Use Supabase Cloud (Recommended for beginners)**

1. Create a project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key to `.env.local`
3. Run migrations via Supabase Dashboard or CLI

**Option B: Local Supabase with Docker**

```bash
# Install Supabase CLI
pnpm add -g supabase

# Start local Supabase
supabase start

# Apply migrations
supabase db push
```

### 5. Start Development Server

```bash
pnpm dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Create a `.env.local` file with the following variables:

```bash
# ============================================================================
# REQUIRED
# ============================================================================

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Admin
ADMIN_EMAIL=admin@example.com

# ============================================================================
# OPTIONAL (Features may be limited without these)
# ============================================================================

# Email (Resend)
RESEND_API_KEY=re_xxxxx
FROM_EMAIL=noreply@yourdomain.com

# Storage (Cloudflare R2)
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_ACCOUNT_ID=your_account_id
R2_PUBLIC_URL=https://your-bucket.r2.dev

# YouTube API
YOUTUBE_API_KEY=your_youtube_api_key
YOUTUBE_CHANNEL_ID=your_channel_id
YOUTUBE_PLAYLIST_ID=your_playlist_id

# Caching (Redis)
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=debug  # debug, info, warn, error
```

---

## Database Setup

### Running Migrations

Migrations are located in `supabase/migrations/`. Apply them in order:

```bash
# Using Supabase CLI
supabase db push

# Or manually via SQL editor in Supabase Dashboard
```

### Migration Files

| File | Description |
|------|-------------|
| `001_initial_schema.sql` | Core tables, RLS, functions |
| `002_notifications.sql` | Notification system |
| `003_user_preferences.sql` | User settings |
| `004_content_reports.sql` | Moderation and reports |
| `005_audit_logs.sql` | Security audit trail |

### Generating Types

After schema changes, regenerate TypeScript types:

```bash
pnpm supabase gen types typescript --local > lib/db/types.ts
```

---

## Running the Application

```bash
# Development mode (with hot reload)
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# Type checking
pnpm type-check

# Linting
pnpm lint

# Format code
pnpm format
```

---

## Project Structure

```
scroungers-multimedia/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth-related pages
│   ├── (dashboard)/       # Protected dashboard pages
│   ├── api/               # API routes
│   ├── articles/          # Article pages
│   └── components/        # Page-specific components
├── components/            # Shared UI components
├── lib/                   # Core libraries
│   ├── api/              # API helpers, middleware, validation
│   ├── cache/            # Caching layer
│   ├── config/           # Configuration management
│   ├── db/               # Database operations
│   ├── email/            # Email client and templates
│   ├── logger/           # Structured logging
│   ├── monitoring/       # Metrics and health checks
│   ├── r2/               # Cloudflare R2 storage
│   ├── security/         # CSRF, sanitization, headers
│   ├── supabase/         # Supabase client
│   └── test/             # Test utilities
├── supabase/
│   └── migrations/       # Database migrations
├── docs/                  # Documentation
├── __tests__/            # Test files
│   ├── unit/             # Unit tests
│   └── integration/      # Integration tests
└── public/               # Static assets
```

### Key Files

| File | Purpose |
|------|---------|
| `middleware.ts` | Auth middleware, security headers |
| `lib/api/response.ts` | Standardized API responses |
| `lib/api/middleware.ts` | Auth and role middleware |
| `lib/api/validation.ts` | Zod validation schemas |
| `lib/api/error-handler.ts` | Centralized error handling |
| `lib/logger/index.ts` | Structured JSON logging |

---

## Development Workflow

### Adding a New API Endpoint

1. Create route file in `app/api/your-route/route.ts`
2. Add validation schema in `lib/api/validation.ts`
3. Use `withRouteHandler` for consistent handling:

```typescript
import { NextRequest } from 'next/server';
import { withRouteHandler } from '@/lib/api/route-wrapper';
import { success, parseBody } from '@/lib/api';
import { yourSchema } from '@/lib/api/validation';

async function handler(request: NextRequest) {
  const body = await parseBody(request, yourSchema);
  // ... your logic
  return success({ data });
}

export const POST = withRouteHandler(handler, {
  requireAuth: true,
  requireRole: ['contributor'],
  csrf: true,
});
```

### Adding a New Database Table

1. Create migration in `supabase/migrations/XXX_your_migration.sql`
2. Define RLS policies
3. Add types in `lib/db/types.ts`
4. Create helper functions in `lib/db/your-entity.ts`
5. Re-export from `lib/db/index.ts`

### Adding Email Templates

1. Add template function in `lib/email/templates.ts`
2. Follow existing pattern using `baseTemplate()` and `button()`
3. Export from the file

---

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test __tests__/unit/lib/api/response.test.ts
```

### Test Structure

```
__tests__/
├── unit/
│   └── lib/
│       ├── api/          # API utilities tests
│       ├── db/           # Database helpers tests
│       └── security/     # Security utilities tests
└── integration/
    └── api/              # API route tests
```

### Writing Tests

```typescript
// Unit test example
describe('myFunction', () => {
  it('should do something', () => {
    const result = myFunction(input);
    expect(result).toBe(expected);
  });
});

// Integration test example
describe('GET /api/posts', () => {
  it('should return posts list', async () => {
    const response = await GET(new NextRequest('http://localhost/api/posts'));
    expect(response.status).toBe(200);
  });
});
```

---

## Code Style

We use ESLint and Prettier for code consistency.

### ESLint Rules

- TypeScript strict mode
- No unused variables (warnings)
- Prefer const
- No explicit `any` (warnings)

### Prettier Config

```json
{
  "semi": true,
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

### Commands

```bash
# Lint
pnpm lint

# Lint and fix
pnpm lint:fix

# Format
pnpm format
```

---

## Git Workflow

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation changes

Example: `feature/add-comment-reactions`

### Commit Messages

Follow conventional commits:

```
type(scope): description

[optional body]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
```
feat(api): add comment reactions endpoint
fix(auth): resolve session refresh issue
docs: update API documentation
```

### Pull Request Process

1. Create feature branch from `main`
2. Make changes and commit
3. Push branch and open PR
4. Ensure CI passes
5. Request review
6. Squash and merge

---

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to `main`

### Manual Deployment

```bash
# Build
pnpm build

# Start (requires Node.js server)
pnpm start

# Or use Docker
docker build -t scroungers .
docker run -p 3000:3000 scroungers
```

### Environment Configuration

Set these in your deployment platform:

- All variables from `.env.local`
- Set `NODE_ENV=production`
- Set appropriate `NEXT_PUBLIC_SITE_URL`

---

## Troubleshooting

### Common Issues

**1. Supabase connection errors**
```
Error: Invalid API key
```
- Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Ensure Supabase project is running

**2. Migration errors**
```
Error: relation "table_name" already exists
```
- Run migrations in order
- Check if table already exists in Supabase

**3. Type errors after schema change**
```
Property 'x' does not exist on type...
```
- Regenerate types: `pnpm supabase gen types typescript`

**4. Email not sending**
```
Error: API key invalid
```
- Check `RESEND_API_KEY`
- Verify domain in Resend dashboard

### Getting Help

- Check existing issues on GitHub
- Create a new issue with reproduction steps
- Join our Discord community

---

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Resend Documentation](https://resend.com/docs)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [OpenAPI Specification](/docs/openapi.yaml)
- [Backend Architecture](/docs/BACKEND.md)

