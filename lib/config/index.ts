/**
 * Centralized configuration management
 * Type-safe environment variables with validation
 */

interface Config {
  // App
  nodeEnv: 'development' | 'production' | 'test';
  siteUrl: string;

  // Supabase
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey?: string;

  // Cloudflare R2
  r2BucketName?: string;
  r2PublicUrl?: string;
  r2AccountId?: string;
  r2AccessKeyId?: string;
  r2SecretAccessKey?: string;

  // Email (Resend)
  resendApiKey?: string;
  fromEmail: string;
  adminEmail?: string;

  // Redis
  redisUrl?: string;

  // Security
  csrfSecret: string;

  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';

  // Rate Limiting
  rateLimitEnabled: boolean;

  // Feature Flags
  features: {
    emailNotifications: boolean;
    redisCache: boolean;
    monitoring: boolean;
  };
}

/**
 * Validate and load configuration
 */
function loadConfig(): Config {
  const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';

  // Required variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  const config: Config = {
    nodeEnv,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    r2BucketName: process.env.R2_BUCKET_NAME,
    r2PublicUrl: process.env.R2_PUBLIC_URL,
    r2AccountId: process.env.R2_ACCOUNT_ID,
    r2AccessKeyId: process.env.R2_ACCESS_KEY_ID,
    r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    resendApiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.FROM_EMAIL || 'Scroungers <noreply@scroungers.co>',
    adminEmail: process.env.ADMIN_EMAIL,
    redisUrl: process.env.REDIS_URL,
    csrfSecret: process.env.CSRF_SECRET || supabaseAnonKey,
    logLevel: (process.env.LOG_LEVEL ||
      (nodeEnv === 'production' ? 'info' : 'debug')) as Config['logLevel'],
    rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    features: {
      emailNotifications: !!process.env.RESEND_API_KEY,
      redisCache: !!process.env.REDIS_URL && nodeEnv === 'production',
      monitoring: process.env.MONITORING_ENABLED !== 'false',
    },
  };

  // Validate production requirements
  if (nodeEnv === 'production') {
    if (!config.r2BucketName || !config.r2PublicUrl) {
      console.warn('Warning: R2 configuration missing. Media uploads may not work.');
    }
    if (!config.resendApiKey) {
      console.warn('Warning: RESEND_API_KEY not set. Email notifications disabled.');
    }
  }

  return config;
}

// Export singleton config instance
export const config = loadConfig();

// Export individual config getters for convenience
export const getConfig = () => config;

// Validate config on module load
if (typeof window === 'undefined') {
  try {
    loadConfig();
  } catch (error) {
    console.error('Configuration validation failed:', error);
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
  }
}
