# Incident Response Guide

This document outlines the incident response process for Scroungers platform issues.

## Incident Severity Levels

### SEV-1: Critical

**Definition**: Complete service outage or data breach affecting all users.

**Examples**:

- Platform completely down
- Database corruption
- Security breach with data exposure
- Authentication system failure

**Response Time**: Immediate (within 15 minutes)
**Escalation**: All hands, executive notification

### SEV-2: Major

**Definition**: Significant functionality impaired, affecting majority of users.

**Examples**:

- Major feature completely broken
- Performance degradation > 50%
- Partial data loss
- Payment processing failure

**Response Time**: Within 30 minutes
**Escalation**: On-call engineer + engineering lead

### SEV-3: Minor

**Definition**: Limited impact, workaround available.

**Examples**:

- Single feature degraded
- Intermittent errors < 5%
- Non-critical integration failure
- UI bugs affecting usability

**Response Time**: Within 2 hours
**Escalation**: On-call engineer

### SEV-4: Low

**Definition**: Minimal impact, cosmetic issues.

**Examples**:

- Minor UI inconsistencies
- Documentation errors
- Non-blocking bugs

**Response Time**: Next business day
**Escalation**: Normal ticketing process

## Incident Response Process

### Phase 1: Detection & Alert

```
┌─────────────────────────────────────────────┐
│  Monitoring Alert / User Report / Team      │
│                Discovery                     │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│       Acknowledge & Assess Severity         │
└─────────────────────────────────────────────┘
```

**Actions**:

1. Acknowledge the alert/report
2. Assess initial severity
3. Create incident ticket
4. Begin communication

### Phase 2: Triage

**Checklist**:

- [ ] What is the user impact?
- [ ] When did it start?
- [ ] What changed recently?
- [ ] Who needs to be notified?
- [ ] Is there an obvious quick fix?

**Initial Assessment Template**:

```
INCIDENT: [Title]
SEVERITY: [SEV-1/2/3/4]
DETECTED: [Timestamp]
IMPACT: [Description of user impact]
AFFECTED: [Systems/users affected]
INITIAL THEORY: [What might be wrong]
```

### Phase 3: Investigation

**Investigation Steps**:

1. **Check Recent Deployments**

   ```bash
   # Check recent deployments
   git log --oneline -10

   # Check deployment history in Vercel
   vercel list --recent
   ```

2. **Review Logs**

   ```bash
   # Check application logs
   vercel logs --since 1h

   # Check Supabase logs
   # Via dashboard: Project > Logs
   ```

3. **Check Metrics**
   - CPU/Memory usage
   - Error rates
   - Response times
   - Database connections

4. **Test Key Paths**
   - Authentication
   - API endpoints
   - Database queries
   - External services

### Phase 4: Mitigation

**Common Mitigations**:

| Issue                 | Mitigation                    |
| --------------------- | ----------------------------- |
| Bad deployment        | Roll back to previous version |
| Database overload     | Scale up / kill long queries  |
| Memory leak           | Restart services              |
| Traffic spike         | Enable rate limiting          |
| External service down | Enable fallback               |

**Rollback Procedure**:

```bash
# Vercel rollback
vercel rollback [deployment-url]

# Or redeploy previous commit
git checkout [previous-commit]
vercel --prod
```

### Phase 5: Resolution

**Verification Checklist**:

- [ ] Error rates returned to normal
- [ ] All key user flows working
- [ ] Monitoring shows healthy status
- [ ] No new related alerts

**Resolution Communication**:

```
UPDATE: [Incident Title]
STATUS: Resolved
RESOLUTION: [What fixed it]
DURATION: [How long it lasted]
NEXT STEPS: [Post-incident review scheduled]
```

### Phase 6: Post-Incident

**Post-Incident Review (PIR)**:

Schedule within 48 hours of resolution.

**PIR Template**:

```markdown
# Post-Incident Review: [Title]

## Timeline

- [Time]: [Event]
- [Time]: [Event]

## Impact

- Duration: X hours
- Users affected: X
- Revenue impact: $X (if applicable)

## Root Cause

[What actually caused the incident]

## What Went Well

- [Positive aspect]

## What Could Be Improved

- [Area for improvement]

## Action Items

- [ ] [Action] - Owner - Due Date
- [ ] [Action] - Owner - Due Date

## Lessons Learned

[Key takeaways]
```

## Communication Templates

### Initial Notification (Internal)

```
🚨 INCIDENT DECLARED

Severity: [SEV-X]
Title: [Brief description]
Impact: [User impact]
Lead: [Incident commander]

Join #incident-[id] for updates
```

### Status Update (Internal)

```
📊 INCIDENT UPDATE

Status: [Investigating/Identified/Monitoring/Resolved]
Update: [What's changed]
Next Update: [When]
```

### Customer Communication

**Investigating**:

```
We are currently investigating reports of [issue].
Some users may experience [impact].
We will provide updates as we learn more.
```

**Identified**:

```
We have identified the cause of [issue] and are
implementing a fix. [Impact] should be resolved
shortly. We apologize for any inconvenience.
```

**Resolved**:

```
The issue affecting [feature/service] has been
resolved. All systems are now operating normally.
Thank you for your patience.
```

## On-Call Procedures

### On-Call Responsibilities

1. Respond to alerts within SLA
2. Assess and triage incidents
3. Escalate when needed
4. Document actions taken
5. Hand off to next on-call

### On-Call Checklist

**Start of Shift**:

- [ ] Verify access to all systems
- [ ] Check current system status
- [ ] Review open incidents
- [ ] Confirm contact info is current

**During Shift**:

- [ ] Monitor alert channels
- [ ] Respond within SLA
- [ ] Document everything
- [ ] Escalate appropriately

**End of Shift**:

- [ ] Hand off open issues
- [ ] Update documentation
- [ ] Note any concerns for next shift

## Escalation Paths

### Technical Escalation

```
On-Call Engineer
      │
      ▼
Engineering Lead
      │
      ▼
VP Engineering
      │
      ▼
CTO
```

### Business Escalation

```
On-Call Engineer
      │
      ▼
Engineering Lead
      │
      ▼
Product Manager
      │
      ▼
CEO
```

## Contact Information

### Internal Contacts

| Role             | Contact   | Method        |
| ---------------- | --------- | ------------- |
| On-Call Engineer | PagerDuty | Automatic     |
| Engineering Lead | [Name]    | Slack / Phone |
| VP Engineering   | [Name]    | Slack / Phone |
| Security Lead    | [Name]    | Slack / Phone |

### External Contacts

| Service          | Contact             | SLA              |
| ---------------- | ------------------- | ---------------- |
| Supabase         | support.supabase.io | Priority support |
| Vercel           | vercel.com/support  | Priority support |
| Domain Registrar | [Contact]           | -                |

## Tools & Access

### Monitoring & Logs

- **Vercel Dashboard**: Deployment status, logs
- **Supabase Dashboard**: Database, auth, storage
- **Prometheus/Grafana**: Custom metrics
- **Error Tracking**: Application errors

### Communication

- **Slack**: #incidents, #engineering
- **PagerDuty**: Alerting and on-call
- **Status Page**: Public communication

### Runbooks

Quick access to common procedures:

- [Database Connection Issues](./runbooks/database.md)
- [High Memory Usage](./runbooks/memory.md)
- [API Rate Limiting](./runbooks/rate-limiting.md)
- [Security Incidents](./runbooks/security.md)

---

## Quick Reference Card

```
┌────────────────────────────────────────────┐
│           INCIDENT QUICK GUIDE             │
├────────────────────────────────────────────┤
│                                            │
│  1. ACKNOWLEDGE the alert                  │
│  2. ASSESS severity (SEV-1/2/3/4)          │
│  3. CREATE incident ticket                 │
│  4. COMMUNICATE to stakeholders            │
│  5. INVESTIGATE root cause                 │
│  6. MITIGATE (rollback, scale, etc.)       │
│  7. RESOLVE and verify                     │
│  8. DOCUMENT and schedule PIR              │
│                                            │
├────────────────────────────────────────────┤
│  SEV-1: 15min | SEV-2: 30min | SEV-3: 2hr  │
├────────────────────────────────────────────┤
│  Slack: #incidents | PagerDuty: On-Call    │
└────────────────────────────────────────────┘
```
