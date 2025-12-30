import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { supabaseFetch } from '@/lib/supabase/fetch';
import type { Database } from '@/types/database';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

const SUPABASE_URL = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
const SUPABASE_ANON_KEY = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { fetch: supabaseFetch },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes
  const protectedPaths = ['/dashboard', '/editor', '/admin'];
  const authPaths = ['/login', '/register', '/forgot-password', '/reset-password'];

  // Role requirements for different paths
  const roleRequirements: Record<string, string[]> = {
    '/dashboard': ['contributor', 'editor', 'admin', 'superadmin'],
    '/editor': ['editor', 'admin', 'superadmin'],
    '/admin': ['admin', 'superadmin'],
  };

  const pathname = request.nextUrl.pathname;

  // Check if accessing protected route without auth
  if (protectedPaths.some((path) => pathname.startsWith(path)) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Check role-based access for protected routes
  if (protectedPaths.some((path) => pathname.startsWith(path)) && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    // Find matching route requirement
    for (const [routePrefix, allowedRoles] of Object.entries(roleRequirements)) {
      if (pathname.startsWith(routePrefix)) {
        if (!allowedRoles.includes(profile.role)) {
          const url = request.nextUrl.clone();
          // Redirect to appropriate fallback
          if (profile.role === 'reader') {
            url.pathname = '/apply';
          } else if (profile.role === 'contributor' && pathname.startsWith('/editor')) {
            url.pathname = '/dashboard';
          } else if (profile.role === 'contributor' && pathname.startsWith('/admin')) {
            url.pathname = '/dashboard';
          } else if (profile.role === 'editor' && pathname.startsWith('/admin')) {
            url.pathname = '/editor';
          } else {
            url.pathname = '/';
          }
          return NextResponse.redirect(url);
        }
        break;
      }
    }
  }

  // Redirect authenticated users away from auth pages
  if (authPaths.some((path) => pathname.startsWith(path)) && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
