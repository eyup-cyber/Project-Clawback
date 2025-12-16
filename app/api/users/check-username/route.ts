import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { success, handleApiError, parseParams, rateLimitByIp } from '@/lib/api';
import { isUsernameAvailable } from '@/lib/db';

const checkUsernameSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/),
});

// ============================================================================
// GET /api/users/check-username - Check if username is available
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    // Rate limit to prevent enumeration
    rateLimitByIp(request, { maxRequests: 30, windowMs: 60000 });

    const { searchParams } = new URL(request.url);
    const { username } = parseParams(searchParams, checkUsernameSchema);

    const available = await isUsernameAvailable(username);

    return success({ available, username: username.toLowerCase() });
  } catch (err) {
    return handleApiError(err);
  }
}






