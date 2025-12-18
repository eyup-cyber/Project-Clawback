import { createBrowserClient } from '@supabase/ssr';

// Access env vars directly for Next.js to inline them at build time
// (dynamic access via process.env[key] doesn't work for client-side code)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

// Note: Using untyped client due to @supabase/ssr v0.8 type inference issues
// Types are validated at runtime through Supabase RLS and schema constraints
export function createClient() {
  return createBrowserClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
}
