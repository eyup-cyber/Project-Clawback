# API Authentication Guide

## Overview

Scroungers Multimedia uses multiple authentication methods to secure API access:

1. **Session-based authentication** - For web application users
2. **API Key authentication** - For programmatic access
3. **OAuth tokens** - For third-party integrations

## Session Authentication

### Login Flow

#### Email/Password Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com"
    },
    "session": {
      "access_token": "...",
      "expires_at": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### OAuth Login

Redirect users to:
```
/api/auth/oauth?provider=google
/api/auth/oauth?provider=twitter
```

#### Magic Link Login

```http
POST /api/auth/magic-link
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### Two-Factor Authentication

If 2FA is enabled, after initial login:

```http
POST /api/auth/2fa/verify
Content-Type: application/json

{
  "code": "123456",
  "isBackupCode": false
}
```

### Session Management

#### List Active Sessions

```http
GET /api/auth/sessions
Authorization: Bearer <access_token>
```

#### Revoke Session

```http
DELETE /api/auth/sessions/{session_id}
Authorization: Bearer <access_token>
```

## API Key Authentication

### Obtaining API Keys

1. Navigate to Dashboard → Settings → API Keys
2. Click "Create New Key"
3. Select scopes and create
4. **Copy the key immediately** - it won't be shown again

### Using API Keys

Include the API key in the `Authorization` header:

```http
GET /api/posts
Authorization: ApiKey scrng_your_api_key_here
```

Or as a query parameter (not recommended for production):

```http
GET /api/posts?api_key=scrng_your_api_key_here
```

### Available Scopes

| Scope | Description |
|-------|-------------|
| `posts:read` | Read published posts |
| `posts:write` | Create and edit posts |
| `media:upload` | Upload media files |
| `profile:read` | Read user profile |
| `profile:write` | Update user profile |
| `comments:read` | Read comments |
| `comments:write` | Create comments |
| `analytics:read` | Read analytics data |

### API Key Management

#### List Keys

```http
GET /api/keys
Authorization: Bearer <access_token>
```

#### Create Key

```http
POST /api/keys
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "My Integration",
  "scopes": ["posts:read", "comments:read"],
  "expiresInDays": 90,
  "allowedIps": ["192.168.1.1"]
}
```

#### Delete Key

```http
DELETE /api/keys?id={key_id}
Authorization: Bearer <access_token>
```

## Security Best Practices

### For Web Applications

1. Store session tokens in HTTP-only cookies
2. Implement CSRF protection
3. Use secure (HTTPS-only) cookies in production
4. Set appropriate cookie expiration

### For API Consumers

1. Store API keys securely (environment variables, secrets manager)
2. Never commit API keys to version control
3. Use IP allowlisting when possible
4. Rotate keys periodically
5. Use minimal required scopes

### Rate Limiting

All API endpoints are rate limited:

| Endpoint Type | Limit |
|--------------|-------|
| Authentication | 5 requests/minute |
| API (unauthenticated) | 100 requests/minute |
| API (authenticated) | 1000 requests/minute |
| File uploads | 10 requests/minute |

Rate limit headers:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640000000
```

## Error Responses

### Authentication Errors

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired authentication"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid credentials |
| `FORBIDDEN` | 403 | Valid auth but insufficient permissions |
| `INVALID_TOKEN` | 401 | Token format is invalid |
| `TOKEN_EXPIRED` | 401 | Token has expired |
| `RATE_LIMITED` | 429 | Too many requests |
| `INVALID_SCOPE` | 403 | API key missing required scope |

## Webhook Authentication

When receiving webhooks, verify the signature:

```typescript
import { verifyWebhookSignature } from '@/lib/webhooks/signing';

// In your webhook handler
const signature = request.headers.get('X-Webhook-Signature');
const body = await request.text();

const { valid, error } = verifyWebhookSignature(body, signature, webhookSecret);
if (!valid) {
  return new Response('Invalid signature', { status: 401 });
}
```

## Testing Authentication

### Development

Use Supabase local development:

```bash
npx supabase start
```

### Test Users

Create test users via Supabase dashboard or SQL:

```sql
-- Create test user
INSERT INTO auth.users (id, email)
VALUES ('test-uuid', 'test@example.com');

INSERT INTO profiles (id, username, role)
VALUES ('test-uuid', 'testuser', 'contributor');
```

## Related Documentation

- [API Errors Reference](./errors.md)
- [Rate Limiting Guide](./rate-limiting.md)
- [Security Architecture](../architecture/security.md)
