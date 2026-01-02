# Scroungers Multimedia - Backend Handoff Guide

> **Last Updated**: January 2025  
> **Branch**: `supabase-mocks-9e7b5`  
> **Repo**: https://github.com/eyup-cyber/Project-Clawback

---

## Quick Start

```bash
# Install dependencies
npm install --legacy-peer-deps

# Run locally
npm run dev

# Build for Cloudflare Pages
npm run pages:build

# Deploy to Cloudflare
npm run pages:deploy
```

---

## What's Complete ✅

### Frontend (100%)

- **Homepage** with animated hero, particles (Three.js), GSAP animations
- **Navigation** with magnetic hover effects, mobile menu
- **Authentication UI** - Login, Register, Forgot Password, 2FA setup
- **Dashboard** - Stats, posts management, settings
- **Article pages** with reading progress, reactions, comments
- **Admin panel** - User management, content moderation, feature flags
- **Following system** - Categories, tags, authors
- **Bookmarks** with folders and organization
- **Reading history** with timeline and stats

### API Routes (Scaffolded - 99 endpoints)

All routes exist in `app/api/` with edge runtime configured for Cloudflare.
Most return **mock data** and need real Supabase queries.

### Database Schema

Full schema in `supabase/migrations/` (19 migration files):

- Users, profiles, sessions
- Posts, comments, reactions
- Bookmarks, folders
- Following relationships
- Reading history
- Feature flags
- Analytics events
- Notifications

---

## What Remains 🔧

### Priority 1: Core Backend Integration

#### 1. Replace Mock Data with Real Queries

Most API routes return static mock data. Example files needing real implementation:

```
app/api/posts/route.ts              # List posts
app/api/posts/[id]/route.ts         # Get/update post
app/api/feed/personalized/route.ts  # Personalized feed algorithm
app/api/bookmarks/route.ts          # User bookmarks
app/api/reading-history/route.ts    # Reading history
```

Pattern to follow (from existing working routes):

```typescript
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

#### 2. Media Upload Integration

Files: `app/api/media/upload/route.ts`, `app/api/media/presigned-url/route.ts`

Options:

- **Cloudflare R2** (recommended - already configured in next.config.ts)
- **Supabase Storage**
- **AWS S3**

Environment variables needed:

```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
```

#### 3. Ko-fi Webhook Integration

File: `app/api/webhooks/kofi/route.ts`

Ko-fi sends POST requests when creators receive tips. Need to:

1. Verify webhook signature
2. Record transaction in database
3. Notify creator

### Priority 2: Features

#### 4. Email Integration

Files: `lib/email/`, `lib/db/email.ts`

Recommended: **Resend** or **SendGrid**

```
RESEND_API_KEY=
EMAIL_FROM=noreply@scroungersmultimedia.com
```

Emails needed:

- Welcome email
- Password reset
- Email verification
- New follower notification
- Weekly digest

#### 5. Search Implementation

File: `app/api/search/route.ts`

Options:

- **Supabase full-text search** (simplest)
- **Algolia** (best UX)
- **Typesense** (self-hosted)

#### 6. Rate Limiting

Middleware exists but needs Redis or similar:

```
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=
```

### Priority 3: Polish

#### 7. Real-time Features

- Comment updates via Supabase Realtime
- Notification badges
- Live reaction counts

#### 8. Analytics Dashboard

File: `app/api/analytics/route.ts`

Currently returns mock data. Need to:

- Track page views
- Track events
- Generate reports

---

## Environment Variables

### Required for Basic Functionality

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Optional (Enable Features)

```env
# Sentry (Error Tracking)
NEXT_PUBLIC_SENTRY_DSN=

# Media Storage (Cloudflare R2)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# Email (Resend)
RESEND_API_KEY=

# Rate Limiting (Upstash)
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=

# Ko-fi Webhooks
KOFI_VERIFICATION_TOKEN=
```

---

## Cloudflare Pages Deployment

### Build Settings

- **Build command**: `npm run pages:build`
- **Output directory**: `.vercel/output/static`
- **Node version**: 18 or 20

### Steps

1. Go to Cloudflare Dashboard → Pages → Create Project
2. Connect GitHub repo: `eyup-cyber/Project-Clawback`
3. Select branch: `supabase-mocks-9e7b5`
4. Add environment variables (see above)
5. Deploy

### Custom Domain

1. In project settings → Custom domains
2. Add your domain
3. Update DNS (Cloudflare handles SSL)

---

## File Structure Overview

```
app/
├── api/                    # 99 API routes (need real queries)
├── components/             # React components
│   ├── admin/             # Admin panel components
│   ├── dashboard/         # Dashboard components
│   ├── editor/            # Rich text editor
│   ├── effects/           # Animations & particles
│   └── ui/                # Shared UI components
├── dashboard/             # Dashboard pages
└── (auth)/                # Auth pages

lib/
├── db/                    # Database query functions
├── supabase/              # Supabase client setup
├── animations/            # GSAP & animation utilities
└── hooks/                 # React hooks

supabase/
└── migrations/            # Database migrations (run these!)
```

---

## Running Migrations

If setting up a new Supabase project:

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run all migrations
supabase db push
```

---

## Testing

```bash
# Unit tests
npm test

# E2E tests (requires running dev server)
npm run test:e2e
```

---

## Contact

For questions about the frontend implementation, check the codebase comments or review the component files. Most complex logic is documented inline.

Good luck! 🚀
