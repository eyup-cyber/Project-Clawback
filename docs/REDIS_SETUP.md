# Redis Setup Guide

This document outlines the Redis configuration for Scroungers Multimedia.

## Overview

Redis is used for:
- **Rate Limiting**: Sliding window rate limiting for API endpoints
- **Session Storage**: User session management (future)
- **Caching**: Frequently accessed data caching (future)
- **Pub/Sub**: Real-time notifications (future)

## Environment Configuration

### Production
```bash
REDIS_URL=rediss://default:<password>@<host>:<port>
```

### Staging
```bash
REDIS_URL=rediss://default:<password>@<host>:<port>
```

### Local Development
Redis is optional for local development. The system falls back to in-memory storage.

```bash
# Optional - only if you want to test Redis locally
REDIS_URL=redis://localhost:6379
```

## Recommended Providers

### Upstash (Recommended for Serverless)
- **Why**: Native serverless support, HTTP API, no persistent connections
- **Pricing**: Pay-per-request, generous free tier
- **Setup**: https://upstash.com

```bash
# Upstash connection string format
REDIS_URL=rediss://default:<password>@<region>.upstash.io:6379
```

### Redis Cloud (Redis Labs)
- **Why**: Official Redis provider, full feature support
- **Pricing**: Free tier available (30MB)
- **Setup**: https://redis.com/try-free

### Railway
- **Why**: Simple deployment, good DX
- **Pricing**: Usage-based
- **Setup**: https://railway.app

## Key Namespacing

All keys are namespaced by environment to prevent collisions:

```
scroungers:prod:ratelimit:ip:<ip>
scroungers:prod:ratelimit:user:<user_id>
scroungers:dev:ratelimit:ip:<ip>
```

## Connection Configuration

### Timeouts
- **Connect timeout**: 10 seconds
- **Command timeout**: 5 seconds (default)

### Reconnection Strategy
The client uses exponential backoff:
- Initial retry: 100ms
- Max retry: 3000ms
- Max attempts: 10

### Health Checks
- Interval: 30 seconds
- Uses `PING` command
- Automatic fallback to in-memory on failure

## Rate Limiting Configuration

### Default Limits
| Endpoint Type | Requests | Window |
|---------------|----------|--------|
| Public API | 100 | 60s |
| Authenticated | 200 | 60s |
| Write operations | 20 | 60s |
| Auth endpoints | 10 | 60s |

### Custom Limits
```typescript
import { checkRateLimit } from '@/lib/security/rate-limit';

const result = await checkRateLimit('custom-key', {
  maxRequests: 50,
  windowMs: 30000,
  keyPrefix: 'custom',
  sliding: true,
});
```

## Graceful Degradation

The system automatically falls back to in-memory storage when:
1. Redis is not configured (`REDIS_URL` not set)
2. Redis connection fails
3. Redis commands timeout
4. Health check fails

### Fallback Behavior
- Rate limits work per-instance (not distributed)
- Memory cleanup runs every 60 seconds
- Fixed window algorithm (vs sliding window in Redis)

## Monitoring

### Metrics Collected
- `redis.connected` - Connection established
- `redis.ready` - Client ready
- `redis.error` - Client errors
- `redis.connection_failed` - Connection failures
- `redis.health_check_failed` - Health check failures
- `rate_limit.check.redis` - Rate limit check duration (Redis)
- `rate_limit.check.memory` - Rate limit check duration (memory)
- `rate_limit.allowed` - Requests allowed
- `rate_limit.blocked` - Requests blocked

### Logging
All Redis operations are logged with structured logging:
```json
{
  "level": "info",
  "message": "Redis client connected successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Security Considerations

### TLS
Always use `rediss://` (with TLS) in production.

### Password
- Use strong, random passwords
- Rotate credentials periodically
- Never commit credentials to version control

### Network
- Restrict Redis to private networks when possible
- Use IP allowlisting if supported by provider

## Troubleshooting

### Connection Issues
```bash
# Test connection locally
redis-cli -u $REDIS_URL ping
```

### Memory Issues
```bash
# Check memory usage
redis-cli -u $REDIS_URL info memory
```

### Key Inspection
```bash
# List all rate limit keys
redis-cli -u $REDIS_URL keys "scroungers:*:ratelimit:*"

# Get TTL for a key
redis-cli -u $REDIS_URL pttl "scroungers:prod:ratelimit:ip:1.2.3.4"
```

## Local Development with Docker

```bash
# Start Redis locally
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Stop
docker stop redis

# Remove
docker rm redis
```

## Future Enhancements

- [ ] Session storage for distributed sessions
- [ ] Response caching for expensive queries
- [ ] Pub/Sub for real-time notifications
- [ ] Leaderboard/ranking functionality
- [ ] Job queue for background tasks


