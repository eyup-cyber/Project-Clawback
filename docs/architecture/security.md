# Security Architecture

This document describes the security architecture and practices for the Scroungers platform.

## Overview

Scroungers implements a defense-in-depth security strategy with multiple layers of protection:

```
┌─────────────────────────────────────────────────────────┐
│                    CDN / Edge                           │
│  DDoS Protection, WAF, Rate Limiting, SSL Termination   │
├─────────────────────────────────────────────────────────┤
│                  Application Layer                       │
│   Authentication, Authorization, Input Validation        │
├─────────────────────────────────────────────────────────┤
│                   Database Layer                         │
│    Row Level Security, Encryption at Rest                │
├─────────────────────────────────────────────────────────┤
│                Infrastructure Layer                      │
│   Network Isolation, Access Controls, Monitoring         │
└─────────────────────────────────────────────────────────┘
```

## Authentication

### Authentication Methods

| Method         | Use Case           | Implementation                 |
| -------------- | ------------------ | ------------------------------ |
| Email/Password | Primary login      | Supabase Auth                  |
| Magic Link     | Passwordless       | Supabase Auth                  |
| OAuth          | Social login       | Supabase Auth (Google, GitHub) |
| API Keys       | Machine-to-machine | Custom implementation          |

### Password Security

- **Hashing**: bcrypt with cost factor 10
- **Requirements**: Minimum 8 characters
- **Breach Detection**: Check against HaveIBeenPwned (optional)

### Two-Factor Authentication (2FA)

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│  Login   │───▶│  2FA     │───▶│  Success │
│  Flow    │    │  Verify  │    │  Session │
└──────────┘    └──────────┘    └──────────┘
                     │
                     ▼
              ┌──────────────┐
              │ TOTP / Backup│
              │    Codes     │
              └──────────────┘
```

**Implementation**:

- TOTP (RFC 6238) with 30-second window
- Encrypted secret storage (AES-256-GCM)
- 10 backup codes, single-use

### Session Management

**Session Properties**:

- JWT-based (Supabase)
- Access token: 1 hour
- Refresh token: 7 days
- Device fingerprinting for detection

**Session Security**:

- HttpOnly cookies
- Secure flag (HTTPS only)
- SameSite=Lax
- Concurrent session limits

## Authorization

### Role-Based Access Control (RBAC)

| Role          | Capabilities            |
| ------------- | ----------------------- |
| `reader`      | View public content     |
| `contributor` | Create/edit own content |
| `editor`      | Manage all content      |
| `admin`       | Full system access      |

### Permission Matrix

| Resource     | Reader  | Contributor | Editor            | Admin |
| ------------ | ------- | ----------- | ----------------- | ----- |
| Public Posts | Read    | Read        | Read/Write/Delete | Full  |
| Own Posts    | -       | CRUD        | CRUD              | Full  |
| Other Posts  | -       | Read        | CRUD              | Full  |
| Users        | Profile | Profile     | Read              | Full  |
| Settings     | Own     | Own         | -                 | Full  |
| Admin Panel  | -       | -           | Limited           | Full  |

### Row Level Security (RLS)

All database tables use PostgreSQL RLS:

```sql
-- Users can only read their own data
CREATE POLICY "Users read own data"
  ON user_data FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can read all data
CREATE POLICY "Admins read all"
  ON user_data FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

## API Security

### Rate Limiting

| Endpoint Type       | Rate Limit | Window |
| ------------------- | ---------- | ------ |
| Authentication      | 5 req      | 15 min |
| API (authenticated) | 100 req    | 1 min  |
| API (anonymous)     | 20 req     | 1 min  |
| Search              | 30 req     | 1 min  |
| File Upload         | 10 req     | 1 min  |

**Implementation**:

- Token bucket algorithm
- Redis-backed for distributed rate limiting
- User/IP based identification

### API Keys

```
┌─────────────────────────────────────┐
│           API Key Format             │
├─────────────────────────────────────┤
│  scrng_[env]_[random]                │
│  scrng_prod_a1b2c3d4e5f6g7h8        │
└─────────────────────────────────────┘
```

**Security Features**:

- SHA-256 hashed storage
- Scope-based permissions
- IP allowlisting (optional)
- Automatic expiration
- Usage logging

### Request Validation

All API inputs are validated using Zod schemas:

```typescript
const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  status: z.enum(['draft', 'published']),
});
```

## Data Protection

### Encryption

| Data State | Method                     |
| ---------- | -------------------------- |
| In Transit | TLS 1.3                    |
| At Rest    | AES-256 (Supabase managed) |
| Secrets    | AES-256-GCM (application)  |
| Backups    | AES-256                    |

### Sensitive Data Handling

| Data Type   | Storage         | Access              |
| ----------- | --------------- | ------------------- |
| Passwords   | Hashed (bcrypt) | Never exposed       |
| 2FA Secrets | Encrypted       | Encrypted retrieval |
| API Keys    | Hashed          | Prefix shown only   |
| PII         | Database (RLS)  | User/Admin only     |
| Sessions    | JWT             | HttpOnly cookies    |

### Data Minimization

- Collect only necessary data
- Anonymous analytics when possible
- Automatic data retention limits
- GDPR compliance built-in

## Network Security

### HTTPS Configuration

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

- TLS 1.2+ required
- Strong cipher suites only
- Certificate pinning (mobile apps)
- OCSP stapling enabled

### Security Headers

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://*.supabase.co
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### CORS Policy

```javascript
{
  origin: ['https://scroungers.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}
```

## Vulnerability Prevention

### OWASP Top 10 Mitigations

| Risk                     | Mitigation                             |
| ------------------------ | -------------------------------------- |
| Injection                | Parameterized queries, ORM             |
| Broken Auth              | Supabase Auth, 2FA, session management |
| Sensitive Data           | Encryption, HTTPS, minimal exposure    |
| XXE                      | JSON-only APIs, no XML parsing         |
| Broken Access            | RLS, RBAC, authorization checks        |
| Misconfiguration         | Automated security scanning            |
| XSS                      | CSP, output encoding, React            |
| Insecure Deserialization | JSON validation, type checking         |
| Vulnerable Components    | Automated dependency scanning          |
| Logging/Monitoring       | Comprehensive logging, alerting        |

### Input Sanitization

```typescript
// HTML sanitization for user content
import DOMPurify from 'dompurify';

const sanitizedHtml = DOMPurify.sanitize(userInput, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
  ALLOWED_ATTR: ['href'],
});
```

### SQL Injection Prevention

```typescript
// Always use parameterized queries
const { data } = await supabase.from('posts').select('*').eq('id', postId); // Parameterized

// Never concatenate user input
// BAD: `SELECT * FROM posts WHERE id = '${postId}'`
```

## Monitoring & Detection

### Security Logging

**Logged Events**:

- Authentication attempts (success/failure)
- Authorization failures
- API key usage
- Admin actions
- Data exports
- Configuration changes

**Log Format**:

```json
{
  "timestamp": "2024-01-01T00:00:00Z",
  "event": "auth.login_failed",
  "userId": null,
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "details": {
    "reason": "invalid_credentials",
    "email": "user@example.com"
  }
}
```

### Alerting

| Alert               | Threshold     | Action          |
| ------------------- | ------------- | --------------- |
| Failed logins       | 10 in 5 min   | Block IP        |
| API errors          | 5% error rate | Page on-call    |
| Unauthorized access | Any           | Immediate alert |
| Admin login         | Any           | Log + notify    |

### Anomaly Detection

- Unusual login locations
- Abnormal API usage patterns
- Suspicious data access patterns
- Rate limit violations

## Incident Response

### Security Incident Classification

| Class    | Examples                           | Response Time |
| -------- | ---------------------------------- | ------------- |
| Critical | Data breach, system compromise     | Immediate     |
| High     | Vulnerability exploitation attempt | 1 hour        |
| Medium   | Suspicious activity detected       | 4 hours       |
| Low      | Minor policy violation             | 24 hours      |

### Response Process

1. **Detect**: Automated monitoring + manual reports
2. **Contain**: Isolate affected systems
3. **Eradicate**: Remove threat
4. **Recover**: Restore normal operations
5. **Learn**: Post-incident review

## Compliance

### GDPR

- Data processing documentation
- User consent management
- Data portability (export)
- Right to erasure (deletion)
- Privacy by design

### SOC 2 (Infrastructure)

- Supabase: SOC 2 Type II
- Vercel: SOC 2 Type II
- AWS (underlying): SOC 2 Type II

### Security Certifications

| Component  | Certification    |
| ---------- | ---------------- |
| Supabase   | SOC 2 Type II    |
| Vercel     | SOC 2 Type II    |
| Cloudflare | SOC 2, ISO 27001 |

## Security Development Lifecycle

### Code Security

1. **Static Analysis**: ESLint security rules, CodeQL
2. **Dependency Scanning**: npm audit, Snyk
3. **Secret Detection**: TruffleHog in CI
4. **Code Review**: Security-focused reviews

### CI/CD Security

```yaml
security-checks:
  - npm audit --audit-level=high
  - eslint --ext .ts,.tsx
  - codeql-analysis
  - secret-scanning
  - dependency-review
```

### Regular Assessments

| Assessment         | Frequency |
| ------------------ | --------- |
| Vulnerability scan | Weekly    |
| Penetration test   | Annually  |
| Code review        | Per PR    |
| Access review      | Quarterly |

## Third-Party Security

### Vendor Assessment

Before integrating third-party services:

- Review security certifications
- Assess data handling practices
- Review incident response procedures
- Ensure compliance requirements met

### Integration Security

- Minimal scope/permissions
- Secure credential storage
- Regular access audits
- Incident notification agreements

---

## Related Documentation

- [Security Checklist](/docs/ops/security-checklist.md)
- [Incident Response](/docs/ops/incident-response.md)
- [Database Architecture](/docs/architecture/database.md)
- [API Authentication](/docs/api/authentication.md)
