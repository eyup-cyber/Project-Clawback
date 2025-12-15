# Backend Architecture Documentation

## Overview

The Scroungers Multimedia backend is built with Next.js API routes, Supabase for database and authentication, and Cloudflare R2 for media storage. The architecture emphasizes security, performance, and maintainability.

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│   Middleware    │ (Security headers, session management)
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  API Routes     │ (Request handling, validation)
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Service Layer  │ (Business logic)
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Database       │ (Supabase PostgreSQL)
└─────────────────┘
```

## Key Components

### 1. Structured Logging (`lib/logger/`)

- Request ID correlation
- Performance timing
- Error stack traces
- Environment-based log levels

### 2. Error Handling (`lib/api/error-handler.ts`)

- Centralized error handling
- Consistent error responses
- Error code mapping
- Stack traces in development

### 3. Security (`lib/security/`)

- **Sanitization**: HTML/content sanitization to prevent XSS
- **Headers**: Security headers (CSP, HSTS, etc.)
- **CSRF**: Token-based CSRF protection
- **Rate Limiting**: IP and user-based rate limiting with Redis support

### 4. Validation (`lib/api/validation.ts`)

- Zod schemas for all inputs
- Automatic sanitization
- Type-safe validation

### 5. Configuration (`lib/config/`)

- Type-safe environment variables
- Validation on startup
- Feature flags

### 6. Monitoring (`lib/monitoring/`)

- Metrics collection
- Health checks
- Performance tracking

## API Routes

All API routes follow a consistent pattern:

1. Generate request ID
2. Create request context
3. Log request
4. Apply rate limiting
5. Validate authentication (if required)
6. Validate and sanitize inputs
7. Execute business logic
8. Log performance
9. Apply security headers
10. Return response

## Database Schema

See `supabase/migrations/` for the complete database schema.

Key tables:
- `profiles`: User profiles
- `posts`: Content posts
- `comments`: Post comments
- `reactions`: Post reactions
- `categories`: Content categories
- `media`: Uploaded media files
- `notifications`: User notifications

## Security Features

1. **Input Sanitization**: All user inputs are sanitized
2. **XSS Prevention**: HTML sanitization using DOMPurify
3. **SQL Injection**: Prevented by Supabase parameterized queries
4. **CSRF Protection**: Token-based protection for state-changing operations
5. **Rate Limiting**: Prevents abuse
6. **Security Headers**: CSP, HSTS, X-Frame-Options, etc.

## Error Codes

- `BAD_REQUEST`: Invalid request (400)
- `VALIDATION_ERROR`: Validation failed (400)
- `UNAUTHORIZED`: Authentication required (401)
- `FORBIDDEN`: Access denied (403)
- `NOT_FOUND`: Resource not found (404)
- `CONFLICT`: Resource conflict (409)
- `RATE_LIMITED`: Rate limit exceeded (429)
- `INTERNAL_ERROR`: Server error (500)
- `DATABASE_ERROR`: Database error (500)
- `MEDIA_UPLOAD_ERROR`: Media upload failed (500)

## Rate Limits

- Posts: 10 per hour per user
- Comments: 20 per minute per user
- Reactions: 60 per minute per user
- Media uploads: 20 per hour per user
- Contact form: 5 per hour per IP

## Testing

Run tests with:
```bash
npm test
```

Test coverage target: > 80%

## Deployment

1. Set all required environment variables
2. Run database migrations
3. Build: `npm run build`
4. Start: `npm start`

## Monitoring

Health check endpoint: `/api/health`

Returns:
- Overall system status
- Database connectivity
- Storage availability
- Cache status
- Email service status




