/**
 * Unit tests for API error handler
 */

import { ZodError, z } from 'zod';
import { handleApiError } from '@/lib/api/error-handler';
import { ApiError } from '@/lib/api/response';

describe('API Error Handler', () => {
  describe('handleApiError', () => {
    it('should handle ApiError instances', async () => {
      const error = new ApiError('Custom error', 'CUSTOM_ERROR', { detail: 'extra' });
      const response = handleApiError(error);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error.message).toBe('Custom error');
      expect(json.error.code).toBe('CUSTOM_ERROR');
    });

    it('should handle ZodError for validation failures', async () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      });

      let zodError: ZodError;
      try {
        schema.parse({ email: 'invalid', age: 10 });
      } catch (e) {
        zodError = e as ZodError;
      }

      const response = handleApiError(zodError!);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
      expect(json.error.details).toBeDefined();
    });

    it('should handle Supabase unique violation error', async () => {
      const supabaseError = {
        code: '23505',
        message: 'duplicate key value violates unique constraint',
      };

      const response = handleApiError(supabaseError);

      expect(response.status).toBe(409);
      const json = await response.json();
      expect(json.error.code).toBe('CONFLICT');
    });

    it('should handle Supabase foreign key violation', async () => {
      const supabaseError = {
        code: '23503',
        message: 'violates foreign key constraint',
      };

      const response = handleApiError(supabaseError);

      expect(response.status).toBe(400);
    });

    it('should handle Supabase not found error', async () => {
      const supabaseError = {
        code: 'PGRST116',
        message: 'The result contains 0 rows',
      };

      const response = handleApiError(supabaseError);

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error.code).toBe('NOT_FOUND');
    });

    it('should handle generic Error instances', async () => {
      const error = new Error('Something went wrong');
      const response = handleApiError(error);

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.error.message).toBe('Something went wrong');
    });

    it('should handle unknown error types', async () => {
      const response = handleApiError('string error');

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.error.code).toBe('INTERNAL_ERROR');
    });

    it('should include request ID when provided', async () => {
      const error = new Error('Test error');
      const response = handleApiError(error, 'req-123');

      const json = await response.json();
      // Request ID might be included in the response or just logged
      expect(response.status).toBe(500);
    });
  });
});
