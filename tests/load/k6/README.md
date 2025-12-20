# Load Testing with k6

This directory contains k6 load testing scripts for the Scroungers platform.

## Prerequisites

Install k6:

```bash
# macOS
brew install k6

# Windows (with Chocolatey)
choco install k6

# Linux
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Test Scripts

### smoke.js - Smoke Test

Basic sanity check that the system is working.

```bash
k6 run smoke.js
```

- 1 virtual user
- 1 minute duration
- Verifies basic endpoints respond

### load.js - Load Test

Standard load test with ramping users.

```bash
k6 run load.js
```

- Ramps from 0 to 100 users
- 16 minute total duration
- Tests realistic user behavior

### stress.js - Stress Test

Pushes the system to find breaking points.

```bash
k6 run stress.js
```

- Ramps up to 400 users
- 18 minute total duration
- More aggressive request patterns

## Configuration

### Environment Variables

Set the base URL for testing:

```bash
# Test against local development
k6 run -e BASE_URL=http://localhost:3000 smoke.js

# Test against staging
k6 run -e BASE_URL=https://staging.scroungers.com smoke.js

# Test against production (be careful!)
k6 run -e BASE_URL=https://scroungers.com smoke.js
```

### Custom Options

Override default options:

```bash
# Run with more VUs
k6 run --vus 200 --duration 10m load.js

# Run specific scenario
k6 run --env SCENARIO=search load.js
```

## Interpreting Results

### Key Metrics

| Metric              | Description          | Target        |
| ------------------- | -------------------- | ------------- |
| `http_req_duration` | Request latency      | p95 < 500ms   |
| `http_req_failed`   | Failed request rate  | < 1%          |
| `vus`               | Active virtual users | As configured |
| `iterations`        | Completed iterations | -             |

### Thresholds

Each test has built-in thresholds. A test fails if:

- **Smoke**: p95 latency > 500ms or error rate > 1%
- **Load**: p95 latency > 1000ms or error rate > 5%
- **Stress**: p95 latency > 3000ms or error rate > 15%

## Output Formats

### Console (default)

```bash
k6 run smoke.js
```

### JSON

```bash
k6 run --out json=results.json smoke.js
```

### InfluxDB (for Grafana)

```bash
k6 run --out influxdb=http://localhost:8086/k6 smoke.js
```

### Cloud (k6 Cloud)

```bash
k6 cloud smoke.js
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run load tests
  run: |
    k6 run --out json=results.json smoke.js
  env:
    BASE_URL: ${{ secrets.STAGING_URL }}
```

### With Thresholds

```yaml
- name: Run load tests
  run: |
    k6 run smoke.js || exit 1
```

## Best Practices

1. **Start with Smoke Tests**: Verify the system is working before load testing
2. **Test in Staging First**: Never run aggressive tests against production
3. **Monitor During Tests**: Watch server metrics, not just k6 output
4. **Gradual Ramp-up**: Avoid shocking the system with sudden load
5. **Test Realistic Scenarios**: Model actual user behavior
6. **Run Regularly**: Include in CI/CD pipeline

## Troubleshooting

### High Error Rates

- Check server logs for errors
- Verify database connections aren't exhausted
- Check rate limiting configuration

### Slow Response Times

- Check database query performance
- Verify caching is working
- Check for N+1 queries

### k6 Errors

```bash
# Debug mode
k6 run --http-debug smoke.js

# Verbose output
k6 run --verbose smoke.js
```

## Additional Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Cloud](https://k6.io/cloud/)
- [Grafana k6 Dashboard](https://grafana.com/grafana/dashboards/2587)
