# API Error Handling

This document describes the error responses you may encounter when using the Scroungers API.

## Error Response Format

All errors follow a consistent JSON format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Fields

| Field           | Type    | Description                   |
| --------------- | ------- | ----------------------------- |
| `success`       | boolean | Always `false` for errors     |
| `error.code`    | string  | Machine-readable error code   |
| `error.message` | string  | Human-readable description    |
| `error.details` | object  | Additional context (optional) |

## HTTP Status Codes

| Code | Meaning               | Common Causes                          |
| ---- | --------------------- | -------------------------------------- |
| 400  | Bad Request           | Invalid parameters, validation errors  |
| 401  | Unauthorized          | Missing or invalid authentication      |
| 403  | Forbidden             | Insufficient permissions               |
| 404  | Not Found             | Resource doesn't exist                 |
| 409  | Conflict              | Resource already exists, duplicate key |
| 422  | Unprocessable Entity  | Validation failed                      |
| 429  | Too Many Requests     | Rate limit exceeded                    |
| 500  | Internal Server Error | Server-side error                      |
| 503  | Service Unavailable   | Service temporarily down               |

## Error Codes

### Authentication Errors

| Code              | HTTP Status | Description                                       |
| ----------------- | ----------- | ------------------------------------------------- |
| `UNAUTHORIZED`    | 401         | No authentication provided or invalid credentials |
| `TOKEN_EXPIRED`   | 401         | Access token has expired                          |
| `INVALID_TOKEN`   | 401         | Token is malformed or invalid                     |
| `SESSION_EXPIRED` | 401         | Session has expired                               |
| `2FA_REQUIRED`    | 401         | Two-factor authentication required                |
| `2FA_INVALID`     | 401         | Invalid 2FA code                                  |

**Example:**

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

### Authorization Errors

| Code                 | HTTP Status | Description                                 |
| -------------------- | ----------- | ------------------------------------------- |
| `FORBIDDEN`          | 403         | User doesn't have permission                |
| `ROLE_REQUIRED`      | 403         | Specific role required                      |
| `RESOURCE_FORBIDDEN` | 403         | Cannot access this resource                 |
| `ACCOUNT_SUSPENDED`  | 403         | Account has been suspended                  |
| `ACCOUNT_LOCKED`     | 403         | Account locked due to failed login attempts |

**Example:**

```json
{
  "success": false,
  "error": {
    "code": "ROLE_REQUIRED",
    "message": "Editor or Admin role required",
    "details": {
      "requiredRole": ["editor", "admin"],
      "currentRole": "contributor"
    }
  }
}
```

### Validation Errors

| Code                 | HTTP Status | Description                 |
| -------------------- | ----------- | --------------------------- |
| `VALIDATION_ERROR`   | 400         | Request validation failed   |
| `INVALID_INPUT`      | 400         | Invalid input data          |
| `MISSING_FIELD`      | 400         | Required field missing      |
| `INVALID_FORMAT`     | 400         | Field format is invalid     |
| `VALUE_OUT_OF_RANGE` | 400         | Value exceeds allowed range |

**Example:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": {
      "errors": {
        "title": ["Title is required"],
        "content": ["Content must be at least 100 characters"],
        "publishedAt": ["Invalid date format"]
      }
    }
  }
}
```

### Resource Errors

| Code                  | HTTP Status | Description               |
| --------------------- | ----------- | ------------------------- |
| `NOT_FOUND`           | 404         | Resource not found        |
| `CONFLICT`            | 409         | Resource already exists   |
| `GONE`                | 410         | Resource has been deleted |
| `PRECONDITION_FAILED` | 412         | ETag mismatch             |

**Example:**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Post not found",
    "details": {
      "resourceType": "post",
      "resourceId": "123e4567-e89b-12d3-a456-426614174000"
    }
  }
}
```

### Rate Limiting Errors

| Code                  | HTTP Status | Description       |
| --------------------- | ----------- | ----------------- |
| `RATE_LIMIT_EXCEEDED` | 429         | Too many requests |

**Example:**

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again in 60 seconds.",
    "details": {
      "retryAfter": 60,
      "limit": 100,
      "windowSize": 3600
    }
  }
}
```

**Response Headers:**

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1702934400
Retry-After: 60
```

### Server Errors

| Code                  | HTTP Status | Description                     |
| --------------------- | ----------- | ------------------------------- |
| `INTERNAL_ERROR`      | 500         | Unexpected server error         |
| `DATABASE_ERROR`      | 500         | Database operation failed       |
| `SERVICE_UNAVAILABLE` | 503         | Service temporarily unavailable |

**Example:**

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred. Please try again later.",
    "details": {
      "requestId": "req_123456789"
    }
  }
}
```

## Handling Errors

### JavaScript/TypeScript

```typescript
async function fetchPosts() {
  try {
    const response = await fetch('/api/posts', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();

    if (!response.ok) {
      switch (data.error.code) {
        case 'UNAUTHORIZED':
          // Redirect to login
          window.location.href = '/login';
          break;
        case 'RATE_LIMIT_EXCEEDED':
          // Wait and retry
          await sleep(data.error.details.retryAfter * 1000);
          return fetchPosts();
        case 'NOT_FOUND':
          // Show 404 page
          showNotFound();
          break;
        default:
          // Show generic error
          showError(data.error.message);
      }
      return null;
    }

    return data.data;
  } catch (error) {
    // Network error
    showError('Failed to connect to server');
    return null;
  }
}
```

### React Hook

```typescript
function useApiError(error: ApiError | null) {
  useEffect(() => {
    if (!error) return;

    switch (error.code) {
      case 'SESSION_EXPIRED':
        toast.error('Your session has expired. Please log in again.');
        // Trigger re-auth
        break;
      case 'VALIDATION_ERROR':
        // Form errors are usually handled inline
        break;
      default:
        toast.error(error.message);
    }
  }, [error]);
}
```

## Best Practices

1. **Always check `success` field**: Don't assume the request succeeded based on HTTP status alone.

2. **Handle specific error codes**: Use error codes for programmatic handling, not messages.

3. **Implement retry logic**: For transient errors (5xx, rate limits), implement exponential backoff.

4. **Log request IDs**: Include `requestId` from error details when reporting issues.

5. **Don't expose error details**: In production, don't display `details` to end users.

## Debugging

### Request ID

Every request is assigned a unique ID included in the `X-Request-ID` response header:

```
X-Request-ID: req_abc123xyz
```

Include this when reporting issues to help us locate relevant logs.

### Verbose Mode

During development, add `?debug=true` to get more detailed error information (only works in development environment):

```json
{
  "success": false,
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Database query failed",
    "details": {
      "requestId": "req_123",
      "stack": "Error: ...",
      "query": "SELECT ...",
      "params": [...]
    }
  }
}
```

## Related

- [Authentication](/docs/api/authentication.md)
- [Rate Limiting](/docs/api/rate-limiting.md)
- [API Reference](/docs/openapi.yaml)
