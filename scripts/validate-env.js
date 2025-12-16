"use strict";

/**
 * Simple environment validation script.
 * Fails on missing critical variables, warns on recommended ones.
 */

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "CSRF_SECRET",
];

const RECOMMENDED = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_URL",
  "FROM_EMAIL",
  "ADMIN_EMAIL",
  "RESEND_API_KEY",
];

function hasValue(key) {
  return Boolean(process.env[key] && String(process.env[key]).trim().length > 0);
}

function validateUrl(key) {
  if (!hasValue(key)) return true;
  try {
    new URL(process.env[key]);
    return true;
  } catch {
    console.error(`Invalid URL format for ${key}: ${process.env[key]}`);
    return false;
  }
}

function validateLength(key, min) {
  if (!hasValue(key)) return false;
  return String(process.env[key]).length >= min;
}

function run() {
  const missingRequired = REQUIRED.filter((k) => !hasValue(k));
  if (missingRequired.length) {
    console.error(`Missing required environment variables: ${missingRequired.join(", ")}`);
    process.exitCode = 1;
  }

  // URL sanity checks
  const urlKeys = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SITE_URL", "R2_PUBLIC_URL"];
  urlKeys.forEach((k) => {
    if (!validateUrl(k)) {
      process.exitCode = 1;
    }
  });

  // Secret lengths
  if (!validateLength("CSRF_SECRET", 16)) {
    console.error("CSRF_SECRET should be at least 16 characters");
    process.exitCode = 1;
  }

  if (process.env.JWT_SECRET && !validateLength("JWT_SECRET", 32)) {
    console.error("JWT_SECRET should be at least 32 characters");
    process.exitCode = 1;
  }

  // Recommended vars
  const missingRecommended = RECOMMENDED.filter((k) => !hasValue(k));
  if (missingRecommended.length) {
    console.warn(`Recommended environment variables missing: ${missingRecommended.join(", ")}`);
  }

  if (!process.exitCode) {
    // eslint-disable-next-line no-console
    console.info("Environment validation passed.");
  }
}

run();

