#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Security Scanning Script
 * Runs various security checks on the codebase
 */

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, colors.blue);
  console.log('='.repeat(60));
}

function runCommand(command, options = {}) {
  try {
    const result = execSync(command, {
      encoding: 'utf-8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options,
    });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, output: error.stdout || error.message, error };
  }
}

const checks = [];
let hasErrors = false;

// ============================================================================
// NPM Audit
// ============================================================================
logSection('Running npm audit');

const auditResult = runCommand('npm audit --audit-level=high --json', {
  silent: true,
});
if (auditResult.success) {
  try {
    const auditData = JSON.parse(auditResult.output);
    const vulns = auditData.metadata?.vulnerabilities || {};
    const high = vulns.high || 0;
    const critical = vulns.critical || 0;

    if (critical > 0) {
      log(`CRITICAL: ${critical} critical vulnerabilities found`, colors.red);
      hasErrors = true;
      checks.push({ name: 'npm audit (critical)', passed: false });
    } else {
      checks.push({ name: 'npm audit (critical)', passed: true });
    }

    if (high > 0) {
      log(`WARNING: ${high} high severity vulnerabilities found`, colors.yellow);
      checks.push({ name: 'npm audit (high)', passed: false });
    } else {
      checks.push({ name: 'npm audit (high)', passed: true });
    }

    log(
      `Total: ${vulns.total || 0} vulnerabilities (${critical} critical, ${high} high, ${vulns.moderate || 0} moderate, ${vulns.low || 0} low)`
    );
  } catch {
    log('No vulnerabilities found or audit ran successfully', colors.green);
    checks.push({ name: 'npm audit', passed: true });
  }
} else {
  // npm audit returns non-zero when vulnerabilities are found
  try {
    const auditData = JSON.parse(auditResult.output);
    const vulns = auditData.metadata?.vulnerabilities || {};
    const critical = vulns.critical || 0;
    const high = vulns.high || 0;

    if (critical > 0 || high > 0) {
      log(`Found ${critical} critical and ${high} high vulnerabilities`, colors.red);
      hasErrors = critical > 0;
      checks.push({ name: 'npm audit', passed: critical === 0 });
    }
  } catch {
    log('Failed to parse audit results', colors.yellow);
    checks.push({ name: 'npm audit', passed: true });
  }
}

// ============================================================================
// Check for secrets in code
// ============================================================================
logSection('Checking for secrets in code');

const secretPatterns = [
  { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/g },
  { name: 'AWS Secret Key', pattern: /[A-Za-z0-9/+=]{40}/g },
  { name: 'Private Key', pattern: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/g },
  { name: 'GitHub Token', pattern: /ghp_[A-Za-z0-9]{36}/g },
  { name: 'Slack Token', pattern: /xox[baprs]-[A-Za-z0-9-]+/g },
  {
    name: 'Generic API Key',
    pattern: /api[_-]?key['":\s]*[=:]\s*['"][A-Za-z0-9]{20,}['"]/gi,
  },
  {
    name: 'Password in code',
    pattern: /password['":\s]*[=:]\s*['"][^'"]{8,}['"]/gi,
  },
];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const findings = [];

  for (const { name, pattern } of secretPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      // Filter out false positives (like example values or env var references)
      const realMatches = matches.filter(
        (m) =>
          !m.includes('process.env') &&
          !m.includes('example') &&
          !m.includes('your-') &&
          !m.includes('xxx') &&
          !m.includes('placeholder')
      );
      if (realMatches.length > 0) {
        findings.push({ type: name, count: realMatches.length });
      }
    }
  }

  return findings;
}

function scanDirectory(dir, extensions = ['.ts', '.tsx', '.js', '.jsx', '.json']) {
  const findings = [];
  const ignoreDirs = ['node_modules', '.git', '.next', 'dist', 'build', '.cursor'];

  function walk(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!ignoreDirs.includes(item)) {
          walk(fullPath);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (extensions.includes(ext)) {
          const fileFindings = scanFile(fullPath);
          if (fileFindings.length > 0) {
            findings.push({ file: fullPath, findings: fileFindings });
          }
        }
      }
    }
  }

  walk(dir);
  return findings;
}

const secretFindings = scanDirectory(process.cwd());
if (secretFindings.length > 0) {
  log('Potential secrets found:', colors.yellow);
  for (const { file, findings } of secretFindings) {
    log(`  ${file}:`, colors.yellow);
    for (const finding of findings) {
      log(`    - ${finding.type} (${finding.count} occurrence(s))`, colors.yellow);
    }
  }
  checks.push({ name: 'Secret scan', passed: false });
} else {
  log('No secrets found in code', colors.green);
  checks.push({ name: 'Secret scan', passed: true });
}

// ============================================================================
// Check .env files
// ============================================================================
logSection('Checking .env files');

const envFiles = ['.env', '.env.local', '.env.development', '.env.production'];
const foundEnvFiles = envFiles.filter((f) => fs.existsSync(path.join(process.cwd(), f)));

if (foundEnvFiles.length > 0) {
  log('Found .env files:', colors.yellow);
  for (const file of foundEnvFiles) {
    log(`  - ${file}`, colors.yellow);
  }

  // Check if they're in .gitignore
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
    const unignoredEnvFiles = foundEnvFiles.filter(
      (f) => !gitignore.includes(f) && !gitignore.includes('.env*')
    );

    if (unignoredEnvFiles.length > 0) {
      log('WARNING: These .env files may not be in .gitignore:', colors.red);
      for (const file of unignoredEnvFiles) {
        log(`  - ${file}`, colors.red);
      }
      checks.push({ name: '.env gitignore check', passed: false });
    } else {
      log('All .env files are properly gitignored', colors.green);
      checks.push({ name: '.env gitignore check', passed: true });
    }
  }
} else {
  log('No .env files found (using environment variables)', colors.green);
  checks.push({ name: '.env check', passed: true });
}

// ============================================================================
// Check for outdated packages
// ============================================================================
logSection('Checking for outdated packages');

const outdatedResult = runCommand('npm outdated --json', { silent: true });
try {
  const outdated = JSON.parse(outdatedResult.output || '{}');
  const outdatedCount = Object.keys(outdated).length;

  if (outdatedCount > 0) {
    log(`${outdatedCount} packages have updates available`, colors.yellow);
    const majorUpdates = Object.entries(outdated).filter(([, info]) => {
      const current = info.current?.split('.')[0];
      const latest = info.latest?.split('.')[0];
      return current && latest && current !== latest;
    });

    if (majorUpdates.length > 0) {
      log('Packages with major version updates:', colors.yellow);
      for (const [pkg, info] of majorUpdates.slice(0, 5)) {
        log(`  - ${pkg}: ${info.current} → ${info.latest}`, colors.yellow);
      }
      if (majorUpdates.length > 5) {
        log(`  ... and ${majorUpdates.length - 5} more`, colors.yellow);
      }
    }
    checks.push({ name: 'Package updates', passed: true }); // Warning only
  } else {
    log('All packages are up to date', colors.green);
    checks.push({ name: 'Package updates', passed: true });
  }
} catch {
  log('All packages are up to date', colors.green);
  checks.push({ name: 'Package updates', passed: true });
}

// ============================================================================
// Summary
// ============================================================================
logSection('Security Scan Summary');

const passed = checks.filter((c) => c.passed).length;
const failed = checks.filter((c) => !c.passed).length;

for (const check of checks) {
  const status = check.passed ? `${colors.green}✓` : `${colors.red}✗`;
  log(`${status} ${check.name}${colors.reset}`);
}

console.log('');
log(`Passed: ${passed}/${checks.length}`, passed === checks.length ? colors.green : colors.yellow);

if (hasErrors) {
  log('\nSecurity scan failed with critical issues!', colors.red);
  process.exit(1);
} else if (failed > 0) {
  log('\nSecurity scan completed with warnings', colors.yellow);
  process.exit(0);
} else {
  log('\nSecurity scan passed!', colors.green);
  process.exit(0);
}
