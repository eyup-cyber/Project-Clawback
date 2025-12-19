# Deployment Guide

## Prerequisites

- Node.js 20.x or later
- npm 10.x or later
- Git
- Vercel CLI (optional, for manual deployments)
- Supabase CLI (for migrations)

## Environment Setup

### Required Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Storage
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=scroungers-media

# Application
NEXT_PUBLIC_APP_URL=https://scroungers.com
JWT_SECRET=your-jwt-secret

# Optional
REDIS_HOST=localhost
REDIS_PORT=6379
SENTRY_DSN=https://your-sentry-dsn
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

## Deployment Methods

### 1. Vercel (Recommended)

#### Automatic Deployment

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Push to `main` branch for production deployment
4. Push to feature branches for preview deployments

#### Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### 2. Docker

#### Building the Image

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]
```

```bash
# Build
docker build -t scroungers:latest .

# Run
docker run -p 3000:3000 --env-file .env scroungers:latest
```

### 3. Self-Hosted

```bash
# Clone repository
git clone https://github.com/your-org/scroungers-multimedia.git
cd scroungers-multimedia

# Install dependencies
npm ci

# Build
npm run build

# Start with PM2
npm install -g pm2
pm2 start npm --name "scroungers" -- start

# Or with Node directly
NODE_ENV=production npm start
```

## Database Migrations

### Running Migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push

# Or run specific migration
supabase migration up
```

### Migration Best Practices

1. Always test migrations on staging first
2. Create rollback scripts for complex migrations
3. Use transactions where possible
4. Avoid long-running operations during peak hours

## Pre-Deployment Checklist

### Code Quality

- [ ] All tests passing (`npm run test`)
- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] Linting passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)

### Security

- [ ] No sensitive data in repository
- [ ] Environment variables configured
- [ ] CSRF protection enabled
- [ ] Rate limiting configured
- [ ] Security headers enabled

### Performance

- [ ] Bundle size within limits
- [ ] Images optimized
- [ ] Caching configured
- [ ] CDN enabled

### Monitoring

- [ ] Error tracking configured (Sentry)
- [ ] Health check endpoint working
- [ ] Alerts configured
- [ ] Logs accessible

## Post-Deployment

### Verify Deployment

```bash
# Check health endpoint
curl https://your-domain.com/api/health

# Check response time
curl -w "@curl-format.txt" -o /dev/null -s https://your-domain.com
```

### Smoke Tests

1. Load homepage
2. Login flow works
3. Create a test post
4. Upload media
5. Search functionality
6. Admin dashboard accessible

### Rollback Procedure

```bash
# Vercel
vercel rollback

# Or redeploy specific commit
vercel --prod --force
```

## Scaling

### Horizontal Scaling

Vercel automatically scales based on traffic. For self-hosted:

```bash
# Add more instances with PM2
pm2 scale scroungers +2

# Or use load balancer
# Configure nginx/HAProxy for multiple instances
```

### Database Scaling

1. Enable connection pooling (Supavisor)
2. Add read replicas for heavy read loads
3. Optimize slow queries
4. Add appropriate indexes

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Build fails | Check Node version, clear cache |
| Database connection issues | Verify connection string, check firewall |
| 500 errors | Check Sentry, review logs |
| Slow performance | Check database queries, enable caching |

### Useful Commands

```bash
# View logs (Vercel)
vercel logs

# View logs (PM2)
pm2 logs scroungers

# Check memory usage
pm2 monit

# Database connection test
npx supabase status
```

## Related Documentation

- [Architecture Overview](../architecture/overview.md)
- [Security Checklist](./security-checklist.md)
- [Incident Response](./incident-response.md)
